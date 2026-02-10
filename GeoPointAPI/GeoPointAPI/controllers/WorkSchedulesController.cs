using GeoPointAPI.data;
using GeoPointAPI.Models;
using GeoPointAPI.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace GeoPointAPI.controllers;

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

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _context.WorkSchedules.ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWorkScheduleDto dto)
    {
        var schedule = new WorkSchedules
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            DailyHoursTarget = dto.DailyHoursTarget,
            ToleranceMinutes = dto.ToleranceMinutes,
            WorkDays = dto.WorkDays
        };
        
        _context.WorkSchedules.Add(schedule);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetAll), new {id = schedule.Id}, schedule);
    }
}