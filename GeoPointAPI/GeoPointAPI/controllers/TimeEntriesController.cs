using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using GeoPointAPI.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoPointAPI.controllers;
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
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null) return NotFound("User not found");
        
        // TODO: Aqui vai entrar a lógica do GEOFENCING 
        var allowedLocations = await _context.Locations
            .Where(l => l.UserId == null || l.UserId == dto.UserId)
            .ToListAsync();

        if (!allowedLocations.Any())
        {
            return BadRequest("Nenhum local de trabalho configurado para este usuário.");
        }

        bool isInsideFence = false;
        string locationName = ""; // Para saber onde ele bateu o ponto

        foreach (var loc in allowedLocations)
        {
            double distance = GeoCalculator.CalculateDistanceMeters(
                (double)dto.Latitude, 
                (double)dto.Longitude, 
                (double)loc.Latitude, 
                (double)loc.Longitude
            );

            // Verifica se está dentro do raio
            if (distance <= loc.RadiusMeters)
            {
                isInsideFence = true;
                locationName = loc.Name;
                break;
            }
        }

        if (!isInsideFence)
        {
            return BadRequest(new 
            { 
                message = "Você está fora do local de trabalho permitido.",
                your_coords = new { dto.Latitude, dto.Longitude }
            });
        }

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
            .OrderByDescending(t=> t.TimestampUtc) // Mais recente primeiro
            .Take(50) //Paginação simples 
            .ToListAsync();
        return Ok(entries);
    }
}
