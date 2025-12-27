using GeoPointAPI.data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoPointAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/reports/balance/{userId}
    [HttpGet("balance/{userId}")]
    public async Task<IActionResult> GetBalance(Guid userId)
    {
        var balances = await _context.DailyBalances
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.ReferenceDate)
            .ToListAsync();
        return Ok(balances);
    }

    // GET: api/reports/audit-logs
    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs()
    {
        // Cuidado: Em produção, adicione paginação (.Take(100))
        var logs = await _context.AuditLogs
            .Include(a => a.Actor) // Traz quem fez a ação
            .OrderByDescending(a => a.TimestampUtc)
            .Take(50)
            .ToListAsync();
            
        return Ok(logs);
    }
}