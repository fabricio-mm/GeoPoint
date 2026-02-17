using GeoPointAPI.data;
using GeoPointAPI.Models;
using GeoPointAPI.DTOs;
using GeoPointAPI.Enums; // Necessário para acessar o Enum WorkScheduleType
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace GeoPointAPI.Controllers; // Convenção: C maiúsculo

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WorkSchedulesController : ControllerBase
{
    private readonly AppDbContext _context;

    public WorkSchedulesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/WorkSchedules
    // Retorna: [{id: 0, name: "Comercial"...}, {id: 1, name: "Intern"...}]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _context.WorkSchedules.ToListAsync());
    }

    // GET: api/WorkSchedules/0  (Onde 0 é Comercial, 1 Intern, etc)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(WorkScheduleType id)
    {
        var schedule = await _context.WorkSchedules.FindAsync(id);

        if (schedule == null)
            return NotFound(new { message = "Escala não encontrada." });

        return Ok(schedule);
    }

    // PUT: api/WorkSchedules/0
    // Usado para configurar os horários da escala fixa
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(WorkScheduleType id, [FromBody] UpdateWorkScheduleDto dto)
    {
        // 1. Busca pelo Enum (0, 1 ou 2)
        var schedule = await _context.WorkSchedules.FindAsync(id);

        if (schedule == null)
            return NotFound(new { message = "Escala não encontrada." });

        // 2. Atualiza os dados
        schedule.Name = dto.Name;
        schedule.StartTime = dto.StartTime;
        schedule.EndTime = dto.EndTime;
        schedule.ToleranceMinutes = dto.ToleranceMinutes;
        schedule.WorkDays = dto.WorkDays;

        // 3. Salva
        _context.WorkSchedules.Update(schedule);
        await _context.SaveChangesAsync();

        return Ok(schedule);
    }

    // ⚠️ ATENÇÃO: Removemos o POST (Create)
    // Como os IDs são Enums fixos (0, 1, 2) e inseridos via Seed no código,
    // não faz sentido criar novas escalas dinamicamente pela API.
    // Se precisar de uma nova escala (ex: Noturno), adicione no Enum e na Migration.
}
