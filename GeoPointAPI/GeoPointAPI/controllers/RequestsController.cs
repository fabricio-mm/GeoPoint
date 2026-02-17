using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using GeoPointAPI.Enums;
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

    public RequestsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRequestDto dto)
    {
        // 🛡️ REGRA 1: ANTECEDÊNCIA DE 30 DIAS PARA FÉRIAS
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

        _context.Requests.Add(request);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRequestById), new { id = request.Id }, request);
    }

    [HttpPut("{id}/review")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewRequestDto dto)
    {
        // Carregamos a request incluindo o Requester para checar o Departamento
        var request = await _context.Requests
            .Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        var reviewer = await _context.Users.FindAsync(dto.ReviewerId);
        if (reviewer == null) return BadRequest(new { message = "Avaliador inválido." });

        // 🛡️ REGRA 2: PERMISSÃO POR CARGO (Manager ou HR)
        var cargosComPermissao = new List<JobTitle> { JobTitle.Manager, JobTitle.HrAnalyst };
        if (!cargosComPermissao.Contains(reviewer.JobTitle))
        {
            return StatusCode(403, new { message = "Acesso negado: Seu cargo não permite avaliar solicitações." });
        }

        // 🛡️ REGRA 3: TRAVA DE DEPARTAMENTO (Apenas para Gerentes)
        if (reviewer.JobTitle == JobTitle.Manager && reviewer.Department != request.Requester?.Department)
        {
            return StatusCode(403, new { message = "Acesso negado: Você só pode avaliar solicitações do seu próprio departamento." });
        }

        // 🛡️ REGRA 4: CONFLITO DE INTERESSE
        if (request.RequesterId == dto.ReviewerId)
        {
            return BadRequest(new { message = "Conflito de interesse: Você não pode avaliar sua própria solicitação." });
        }

        // 🛡️ REGRA 5: JUSTIFICATIVA OBRIGATÓRIA NA REPROVAÇÃO
        if (dto.NewStatus == RequestStatus.Rejected && string.IsNullOrWhiteSpace(dto.Comment))
        {
            return BadRequest(new { message = "É obrigatório informar o motivo ao rejeitar uma solicitação." });
        }

        // AUTOMATIZAÇÃO DE FÉRIAS
        if (dto.NewStatus == RequestStatus.Accepted && request.Type == RequestType.Vacations)
        {
            var funcionario = await _context.Users.FindAsync(request.RequesterId);
            if (funcionario != null) funcionario.Status = UserStatus.OnVacation;
        }

        // Atualiza a solicitação
        request.Status = dto.NewStatus;
        request.ReviewerId = dto.ReviewerId;

        // ✅ AGORA SALVANDO O COMENTÁRIO DO REVISOR
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
