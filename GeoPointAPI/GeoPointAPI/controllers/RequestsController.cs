using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using GeoPointAPI.Enums;
using GeoPointAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.IO; // Necessário para Path.GetExtension

namespace GeoPointAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RequestsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly GoogleDriveService _driveService;

    public RequestsController(AppDbContext context, GoogleDriveService driveService)
    {
        _context = context;
        _driveService = driveService;
    }

    [HttpPost]
    // [FromForm] permite receber arquivos e dados JSON simultaneamente
    public async Task<IActionResult> Create([FromForm] CreateRequestDto dto)
    {
        // 🛡️ REGRA 1: Validação de Segurança do Arquivo (Antes de tudo!)
        if (dto.Attachments != null && dto.Attachments.Any())
        {
            const long maxFileSize = 15 * 1024 * 1024; // 15MB em bytes
            var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png" };

            foreach (var file in dto.Attachments)
            {
                // Valida Tamanho
                if (file.Length > maxFileSize)
                {
                    return BadRequest(new { message = $"O arquivo '{file.FileName}' excede o limite de 15MB." });
                }

                // Valida Extensão
                var extension = Path.GetExtension(file.FileName).ToLower();
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest(new { message = $"A extensão '{extension}' não é permitida. Apenas PDF, JPG e PNG." });
                }
            }
        }

        // 🛡️ REGRA 2: Trava de Solicitações Pendentes (Máximo 3)
        var pendingCount = await _context.Requests
            .CountAsync(r => r.RequesterId == dto.RequesterId && r.Status == RequestStatus.Pending);

        if (pendingCount >= 3)
            return BadRequest(new { message = "Você já possui 3 solicitações pendentes. Aguarde a avaliação do gestor." });

        // 🛡️ REGRA 3: Anexo Obrigatório para Atestado (DoctorsNote)
        if (dto.Type == RequestType.DoctorsNote && (dto.Attachments == null || !dto.Attachments.Any()))
        {
            return BadRequest(new { message = "Para solicitações de atestado médico, o envio do comprovante em anexo é obrigatório." });
        }

        // 🛡️ REGRA 4: Antecedência de 30 dias para Férias
        if (dto.Type == RequestType.Vacations)
        {
            var dataMinima = DateTime.UtcNow.AddDays(30);
            if (dto.TargetDate < dataMinima)
            {
                return BadRequest(new { message = "Solicitações de férias devem ser feitas com no mínimo 30 dias de antecedência." });
            }
        }

        // Criação do Objeto Request
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

        // Adiciona a Request ao contexto (para gerar o ID, se fosse auto-incremento, mas aqui é GUID então ok)
        _context.Requests.Add(request);

        // 🚀 LÓGICA DE UPLOAD PARA O GOOGLE DRIVE
        if (dto.Attachments != null && dto.Attachments.Any())
        {
            // Busca o nome do usuário para organizar o arquivo no Drive (Ex: Fabricio_Atestado.pdf)
            var requester = await _context.Users.FindAsync(dto.RequesterId);
            string requesterName = requester?.FullName.Replace(" ", "_") ?? "Usuario_Desconhecido";

            foreach (var file in dto.Attachments)
            {
                // 1. Sobe o arquivo pro Google Drive e recebe o ID
                // O método UploadFileAsync já cuida de renomear e jogar na pasta certa
                var driveFileId = await _driveService.UploadFileAsync(file, requesterName);

                // 2. Cria o registro na tabela de Anexos
                var attachment = new Attachment
                {
                    Id = Guid.NewGuid(),
                    RequestId = request.Id, // Vincula a esta solicitação
                    FileName = file.FileName,
                    GoogleDriveFileId = driveFileId // Guarda o ID para recuperar depois
                };

                // Adiciona o anexo ao contexto
                _context.Attachments.Add(attachment);
            }
        }

        // Salva tudo no Banco (Request + Anexos) em uma transação única
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
                r.TargetDate.Date == request.TargetDate.Date); // Compara apenas a data (sem hora)

            // Se o setor tem gente e a aprovação vai estourar 25%
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

        // Automação de Status de Usuário (Opcional: Mudar status do usuário se for Férias Aceitas)
        if (dto.NewStatus == RequestStatus.Accepted && request.Type == RequestType.Vacations)
        {
            var funcionario = await _context.Users.FindAsync(request.RequesterId);
            // Aqui poderíamos mudar o status, mas cuidado: isso mudaria o status AGORA, e não na data das férias.
            // Para fazer certo, precisaria de um Job agendado (BackgroundService).
            // Por enquanto, vamos apenas aprovar a solicitação.
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
    public async Task<ActionResult<Request>> GetRequestById(Guid id)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            //.Include(r => r.Reviewer) // Se tiver Reviewer, descomente
            .Include(r => r.Attachments) // Importante incluir os anexos no retorno
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        return Ok(request);
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<Request>>> GetRequestsByUserId(Guid userId)
    {
        // Verifica se usuário existe antes de buscar
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists) return NotFound(new { message = "Usuário não encontrado." });

        var requests = await _context.Requests
            .Where(r => r.RequesterId == userId)
            .Include(r => r.Attachments) // Traz os anexos na lista também
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
            .Include(r => r.Attachments) // Gestor precisa ver o anexo para aprovar
            .OrderBy(r => r.TargetDate)
            .ToListAsync();

        return Ok(pending);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        // 1. Precisamos incluir os anexos na busca para poder deletá-los também
        var request = await _context.Requests
            .Include(r => r.Attachments) // 👈 O Pulo do Gato
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        if (request.Status != RequestStatus.Pending)
        {
            return BadRequest(new { message = "Não é possível cancelar uma solicitação que já foi avaliada." });
        }

        // 2. Soft Delete na Request (Pai)
        request.IsDeleted = true;
        request.DeletedAt = DateTime.UtcNow;

        // 3. Soft Delete nos Anexos (Filhos) - Cascata Manual
        if (request.Attachments != null)
        {
            foreach (var attachment in request.Attachments)
            {
                attachment.IsDeleted = true;
            }
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRequestDto dto)
    {
        var request = await _context.Requests.FindAsync(id);

        // 1. Verifica se existe
        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        // 🛡️ REGRA DE IMUTABILIDADE (AQUI ESTÁ A MÁGICA)
        // Se o martelo já foi batido (Aceito ou Rejeitado), ninguém toca mais.
        if (request.Status != RequestStatus.Pending)
        {
            return BadRequest(new { message = "Esta solicitação já foi finalizada e não pode ser alterada. Crie uma nova se necessário." });
        }

        // 🛡️ REGRA: Data no Passado (Mesma validação do Create)
        if (request.Type == RequestType.Vacations)
        {
            var dataMinima = DateTime.UtcNow.AddDays(30);
            if (dto.TargetDate < dataMinima)
            {
                return BadRequest(new { message = "Solicitações de férias exigem 30 dias de antecedência." });
            }
        }
        else if (dto.TargetDate < DateTime.Today.AddDays(1))
        {
            return BadRequest(new { message = "A data deve ser futura." });
        }

        // 2. Aplica as alterações
        request.TargetDate = dto.TargetDate;
        request.JustificationUser = dto.Justification;

        // Opcional: Se o usuário editar, você pode querer "resetar" uma aprovação parcial?
        // Como aqui só edita Pending, não precisa se preocupar com isso.

        _context.Requests.Update(request);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Solicitação atualizada com sucesso.", request });
    }
}
