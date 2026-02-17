using System.Security.Claims;
using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using GeoPointAPI.Helpers; // Onde reside o seu GeoCalculator
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace GeoPointAPI.controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TimeEntriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public TimeEntriesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTimeEntryDto dto)
    {
        // 1. Validar se o usuário existe
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null) return NotFound(new { message = "Usuário não encontrado." });

        // 🛡️ REGRA 1: ANTI-SPAM (TRAVA DE 1 MINUTO)
        // Busca o último registro desse usuário para evitar cliques duplos
        var lastEntry = await _context.TimeEntries
            .Where(t => t.UserId == dto.UserId)
            .OrderByDescending(t => t.TimestampUtc)
            .FirstOrDefaultAsync();

        if (lastEntry != null && (DateTime.UtcNow - lastEntry.TimestampUtc).TotalMinutes < 1)
        {
            return BadRequest(new { message = "Aguarde pelo menos 1 minuto para registrar o ponto novamente." });
        }

        // 🛡️ REGRA 2: GEOFENCING (RAIO PERMITIDO)
        var allowedLocations = await _context.Locations
            .Where(l => l.UserId == null || l.UserId == dto.UserId)
            .ToListAsync();

        if (!allowedLocations.Any())
        {
            return BadRequest(new { message = "Nenhum local de trabalho configurado para este usuário." });
        }

        bool isInsideFence = false;
        string locationName = "";

        foreach (var loc in allowedLocations)
        {
            // Usando seu Helper GeoCalculator
            double distance = GeoCalculator.CalculateDistanceMeters(
                (double)dto.Latitude,
                (double)dto.Longitude,
                (double)loc.Latitude,
                (double)loc.Longitude
            );

            // Verifica se está dentro do raio definido no banco para aquele local
            if (distance <= loc.RadiusMeters)
            {
                isInsideFence = true;
                locationName = loc.Name;
                break;
            }
        }

        if (!isInsideFence)
        {
            return StatusCode(403, new
            {
                message = "Bloqueado: Você está fora do local de trabalho permitido.",
                your_coords = new { dto.Latitude, dto.Longitude }
            });
        }

        // 3. REGISTRO DO PONTO
        var timeEntry = new TimeEntry()
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            TimestampUtc = DateTime.UtcNow,
            Type = dto.Type,
            Origin = dto.Origin,
            LatitudeRecorded = dto.Latitude,
            LongitudeRecorded = dto.Longitude,
            IsManualAdjustment = false,
        };

        var hoje = DateTime.UtcNow.Date;
        var primeiroPonto = await _context.TimeEntries
            .Where(t => t.UserId == dto.UserId && t.TimestampUtc >= hoje)
            .OrderBy(t => t.TimestampUtc)
            .FirstOrDefaultAsync();

        if (primeiroPonto != null)
        {
            var duracaoJornada = DateTime.UtcNow - primeiroPonto.TimestampUtc;
            if (duracaoJornada.TotalHours > 12)
            {
                return BadRequest(new { message = "Bloqueio de Segurança: Jornada de 12h excedida. Procure seu gestor." });
            }
        }

        _context.TimeEntries.Add(timeEntry);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Ponto registrado com sucesso em: {locationName}.",
            entry = timeEntry
        });
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUser(Guid userId)
    {
        var entries = await _context.TimeEntries
            .Where(e => e.UserId == userId)
            .OrderByDescending(t => t.TimestampUtc)
            .Take(50)
            .ToListAsync();

        return Ok(entries);
    }
}
