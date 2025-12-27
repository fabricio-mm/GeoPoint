using GeoPointAPI.data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoPointAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuditLogsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/auditlogs?userId=...&entity=User
    // Exemplo de filtros opcionais
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? userId, [FromQuery] string? entity)
    {
        // Começa a query mas não executa ainda (IQueryable)
        var query = _context.AuditLogs
            .Include(a => a.Actor) // Traz o nome de quem fez a ação
            .AsQueryable();

        // Aplica filtros se foram enviados
        if (userId.HasValue)
            query = query.Where(a => a.ActorId == userId);

        if (!string.IsNullOrEmpty(entity))
            query = query.Where(a => a.EntityAffected.ToLower() == entity.ToLower());

        // Ordena do mais recente para o mais antigo e limita a 50 para não travar o front
        var logs = await query
            .OrderByDescending(a => a.TimestampUtc)
            .Take(50) 
            .ToListAsync();

        return Ok(logs);
    }
}