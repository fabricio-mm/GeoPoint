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
            TargetDate = dto.TargetDate, // Lembre-se que o banco vai salvar só a DATA (sem hora)
            JustificationUser = dto.Justification,
            Status = RequestStatus.Pending, // Nasce pendente
            ReviewerId = null // Ainda ninguém avaliou
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
        if (request == null) return NotFound();

        // Verifica se quem está tentando aprovar existe e é ADMIN ou RH (Exemplo simples)
        var reviewer = await _context.Users.FindAsync(dto.ReviewerId);
        if (reviewer == null) return BadRequest("Avaliador inválido.");

        // Aqui você poderia validar: if (reviewer.Role != UserRole.Admin) return Forbid();

        request.Status = dto.NewStatus;
        request.ReviewerId = dto.ReviewerId;

        _context.Requests.Update(request);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Solicitação atualizada para {dto.NewStatus}" });
    }

    // GET: api/Requests/550e8400-e29b... (Agora aceita GUID)
    [HttpGet("{id}")]
    public async Task<ActionResult<Models.Request>> GetRequestById(Guid id)
    {
        var request = await _context.Requests
            .Include(r => r.Requester)   // Nome correto: Requester
            .Include(r => r.Reviewer)    // Bônus: Traz quem aprovou/reprovou
            .Include(r => r.Attachments) // Bônus: Traz os anexos
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null) return NotFound("Solicitação não encontrada.");

        return Ok(request);
    }

    // GET: api/Requests/user/550e8400-e29b... (Agora aceita GUID)
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<Models.Request>>> GetRequestsByUserId(Guid userId)
    {
        // 1. Verifica se o usuário existe (Usando Guid)
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId); // Assumindo que User.Id também é Guid

        if (!userExists) return NotFound("Usuário não encontrado.");

        // 2. Busca as requests desse usuário
        var requests = await _context.Requests
            .Where(r => r.RequesterId == userId) // Nome correto: RequesterId
            .OrderByDescending(r => r.TargetDate) // Usando TargetDate para ordenar
            .ToListAsync();

        return Ok(requests);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        // Retorna tudo que precisa de atenção, incluindo o nome de quem pediu
        var pending = await _context.Requests
            .Where(r => r.Status == RequestStatus.Pending)
            .Include(r => r.Requester)
            .ToListAsync();

        return Ok(pending);
    }



}
