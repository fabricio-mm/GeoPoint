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

    // Criar Solicitação
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRequestDto dto)
    {
        var request = new Request
        {
            Id = Guid.NewGuid(),
            RequesterId = dto.RequesterId,
            Type = dto.Type,
            TargetDate = dto.TargetDate,
            JustificationUser = dto.Justification,
            Status = RequestStatus.Pending, // Nasce pendente
            ReviewerId = null
        };

        _context.Requests.Add(request);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRequestById), new { id = request.Id }, request);
    }

    // Aprovar ou Rejeitar (Review)
    [HttpPut("{id}/review")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewRequestDto dto)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        // 1. Validar se o Avaliador existe
        var reviewer = await _context.Users.FindAsync(dto.ReviewerId);
        if (reviewer == null) return BadRequest(new { message = "Avaliador inválido." });

        // 2. Validações de Segurança (Role e Conflito de Interesse)
        if (reviewer.Role == UserRole.Employee)
        {
            return StatusCode(403, new { message = "Acesso negado: Funcionários não podem avaliar solicitações." });
        }
        if (request.RequesterId == dto.ReviewerId)
        {
            return BadRequest(new { message = "Conflito de interesse: Você não pode avaliar sua própria solicitação." });
        }

        // =================================================================================
        // 🚀 AUTOMAÇÃO DE FÉRIAS (AQUI ESTÁ A MÁGICA)
        // =================================================================================

        // Se foi APROVADO e é pedido de FÉRIAS
        if (dto.NewStatus == RequestStatus.Accepted && request.Type == RequestType.Vacations)
        {
            // Busca o funcionário que pediu as férias
            var funcionario = await _context.Users.FindAsync(request.RequesterId);

            if (funcionario != null)
            {
                // Muda o status dele para "Em Férias"
                funcionario.Status = UserStatus.OnVacation;

                // O Entity Framework é esperto: como alteramos o 'funcionario' e a 'request',
                // o SaveChangesAsync lá embaixo vai salvar as duas alterações numa tacada só (Transação).
            }
        }

        // Atualiza a solicitação
        request.Status = dto.NewStatus;
        request.ReviewerId = dto.ReviewerId;

        _context.Requests.Update(request);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Solicitação atualizada para {dto.NewStatus}" });
    }

    // GET: api/Requests/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Models.Request>> GetRequestById(Guid id)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)
            .Include(r => r.Reviewer)
            //.Include(r => r.Attachments) // Descomente se tiver anexos implementado
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null) return NotFound(new { message = "Solicitação não encontrada." });

        return Ok(request);
    }

    // GET: api/Requests/user/{userId}
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

    // GET: api/Requests/pending (Para o Painel do Gestor)
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var pending = await _context.Requests
            .Where(r => r.Status == RequestStatus.Pending)
            .Include(r => r.Requester) // Importante para saber QUEM pediu
            .OrderBy(r => r.TargetDate)
            .ToListAsync();

        return Ok(pending);
    }

    // Cancelar Solicitação (DELETE)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var request = await _context.Requests.FindAsync(id);

        if (request == null)
        {
            return NotFound(new { message = "Solicitação não encontrada." });
        }

        // 🔒 REGRA DE INTEGRIDADE: Só pode apagar se ainda estiver Pendente.
        // Se já foi aprovado/rejeitado, virou documento histórico e não pode sumir.
        if (request.Status != RequestStatus.Pending)
        {
            return BadRequest(new { message = "Não é possível cancelar uma solicitação que já foi avaliada." });
        }

        _context.Requests.Remove(request);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
