using System.ComponentModel.DataAnnotations;
using GeoPointAPI.Enums;

namespace GeoPointAPI.DTOs;

public class CreateTimeEntryDto
{
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    public TimeEntryType Type { get; set; }
    
    [Required]
    public TimeEntryOrigin Origin { get; set; }
    
    [Required]
    public decimal Latitude { get; set; }
    
    [Required]
    public decimal Longitude { get; set; }
}