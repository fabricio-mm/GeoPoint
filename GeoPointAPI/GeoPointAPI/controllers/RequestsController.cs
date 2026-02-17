using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using GeoPointAPI.Enums;
using GeoPointAPI.Services; // 👈 Certifique-se de ter este namespace
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace GeoPointAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RequestsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly GoogleDriveService _driveService; // 1. Serviço Injetado

    // 2. Adicionado ao Construtor
    public RequestsController(AppDbContext context, GoogleDriveService driveService)
    {
        _context = context;
        _driveService = driveService;
    }

    [HttpPost]
    // [FromForm] permite receber arquivos e dados JSON simultaneamente
    public async Task<IActionResult> Create([FromForm] CreateRequestDto dto)
    {
        // 🛡️ REGRA: Trava de Solicitações Pendentes (Máximo 3)
        var pendingCount = await _context.Requests
            .CountAsync(r => r.RequesterId == dto.RequesterId && r.Status == RequestStatus.Pending);

        if (pendingCount >= 3)
            return BadRequest(new { message = "Você já possui 3 solicitações pendentes. Aguarde a avaliação do gestor." });

        // 🛡️ REGRA: Anexo Obrigatório para Atestado (DoctorsNote)
        if (dto.Type == RequestType.DoctorsNote && (dto.Attachments == null || !dto.Attachments.Any()))
        {
            return BadRequest(new { message = "Para solicitações de atestado médico, o envio do comprovante em anexo é obrigatório." });
        }

        // 🛡️ REGRA: Antecedência de 30 dias para Férias
        if (dto.Type == RequestType.Vacations)
        {
            var dataMinima = DateTime.UtcNow.AddDays(30);
            if (dto.TargetDate < dataMinima)
            {
                return BadRequest(new { message = "Solicitações de férias devem ser feitas com no mínimo 30 dias de antecedência." });
            }
        }

        var request = new Request
        {
            Id = Guid.NewGuid(),
            RequesterId = dto.RequesterId,
            Type = dto.Type,
            TargetDate = dto.TargetDate,
            JustificationUser = dto.Justification,
            Status = RequestStatus.Pending,
            ReviewerId = null
        };

        // 🚀 LÓGICA DE UPLOAD PARA O GOOGLE DRIVE
        if (dto.Attachments != null && dto.Attachments.Any())
        {
            // Buscamos o usuário para usar o nome dele no arquivo (Ex: Fabricio_Atestado.pdf)
            var requester = await _context.Users.FindAsync(dto.RequesterId);
            string requesterName = requester?.FullName ?? "Usuario_Desconhecido";

            foreach (var file in dto.Attachments)
            {
                // 1. Sobe o arquivo pro Google Drive e recebe o ID
                var driveFileId = await _driveService.UploadFileAsync(file, requesterName);

                // 2. Cria o registro na tabela de Anexos
                var attachment = new Attachment
                {
                    Id = Guid.NewGuid(),
                    RequestId = request.Id, // Vincula a esta solicitação
                    FileName = file.FileName,
                    GoogleDriveFileId = driveFileId // Guarda o ID para recuperar depois
                };

                _context.Attachments.Add(attachment);
            }
        }

        _context.Requests.Add(request);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRequestById), new { id = request.Id }, request);
    }

    [HttpPut("{id}/review")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewRequestDto dto)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        // 🛡️ REGRA: Limite de 25% do Setor em Férias Simultâneas
        if (dto.NewStatus == RequestStatus.Accepted && request.Type == RequestType.Vacations)
        {
            var totalDepto = await _context.Users.CountAsync(u => u.Department == request.Requester.Department);

            var aprovadosMesmaData = await _context.Requests.CountAsync(r =>
                r.Requester.Department == request.Requester.Department &&
                r.Type == RequestType.Vacations &&
                r.Status == RequestStatus.Accepted &&
                r.TargetDate.Date == request.TargetDate.Date);

            if (totalDepto > 0 && ((double)(aprovadosMesmaData + 1) / totalDepto) > 0.25)
            {
                return BadRequest(new { message = "Limite de contingenciamento: Mais de 25% do departamento estaria ausente nesta data." });
            }
        }

        var reviewer = await _context.Users.FindAsync(dto.ReviewerId);
        if (reviewer == null) return BadRequest(new { message = "Avaliador inválido." });

        // 🛡️ REGRA: Permissão por Cargo (Manager ou HR)
        var cargosComPermissao = new List<JobTitle> { JobTitle.Manager, JobTitle.HrAnalyst };
        if (!cargosComPermissao.Contains(reviewer.JobTitle))
        {
            return StatusCode(403, new { message = "Acesso negado: Seu cargo não permite avaliar solicitações." });
        }

        // 🛡️ REGRA: Trava de Departamento (Apenas para Gerentes)
        if (reviewer.JobTitle == JobTitle.Manager && reviewer.Department != request.Requester?.Department)
        {
            return StatusCode(403, new { message = "Acesso negado: Você só pode avaliar solicitações do seu próprio departamento." });
        }

        // 🛡️ REGRA: Conflito de Interesse
        if (request.RequesterId == dto.ReviewerId)
        {
            return BadRequest(new { message = "Conflito de interesse: Você não pode avaliar sua própria solicitação." });
        }

        // 🛡️ REGRA: Justificativa obrigatória na Reprovação
        if (dto.NewStatus == RequestStatus.Rejected && string.IsNullOrWhiteSpace(dto.Comment))
        {
            return BadRequest(new { message = "É obrigatório informar o motivo ao rejeitar uma solicitação." });
        }

        // Automação de Status de Usuário
        if (dto.NewStatus == RequestStatus.Accepted && request.Type == RequestType.Vacations)
        {
            var funcionario = await _context.Users.FindAsync(request.RequesterId);
            if (funcionario != null) funcionario.Status = UserStatus.OnVacation;
        }

        // Atualização dos dados da Request
        request.Status = dto.NewStatus;
        request.ReviewerId = dto.ReviewerId;
        request.JustificationReviewer = dto.Comment;

        _context.Requests.Update(request);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Solicitação atualizada para {dto.NewStatus}" });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Models.Request>> GetRequestById(Guid id)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            .Include(r => r.Reviewer)
            .Include(r => r.Attachments) // Importante incluir os anexos no retorno
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        return Ok(request);
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<Models.Request>>> GetRequestsByUserId(Guid userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists) return NotFound(new { message = "Usuário não encontrado." });

        var requests = await _context.Requests
            .Where(r => r.RequesterId == userId)
            .OrderByDescending(r => r.TargetDate)
            .ToListAsync();

        return Ok(requests);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var pending = await _context.Requests
            .Where(r => r.Status == RequestStatus.Pending)
            .Include(r => r.Requester)
            .OrderBy(r => r.TargetDate)
            .ToListAsync();

        return Ok(pending);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        if (request.Status != RequestStatus.Pending)
        {
            return BadRequest(new { message = "Não é possível cancelar uma solicitação que já foi avaliada." });
        }

        _context.Requests.Remove(request);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
