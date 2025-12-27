using System.ComponentModel.DataAnnotations;
using GeoPointAPI.Enums;

namespace GeoPointAPI.DTOs;

public class CreateLocationDto
{
    // Se vier nulo, é escritório da empresa. Se vier ID, é casa do funcionário.
    public Guid? UserId { get; set; } 

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public LocationType Type { get; set; } // 0 = Office, 1 = Home

    [Required]
    public decimal Latitude { get; set; }

    [Required]
    public decimal Longitude { get; set; }

    public int RadiusMeters { get; set; } = 100;
}