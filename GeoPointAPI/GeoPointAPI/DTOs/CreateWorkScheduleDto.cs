using System.ComponentModel.DataAnnotations;

namespace GeoPointAPI.DTOs;

public class CreateWorkScheduleDto
{
    [Required]
    public string Name { get; set; } = String.Empty;
    
    [Required]
    public TimeSpan DailyHoursTarget { get; set;}
    public int ToleranceMinutes { get; set; } = 10;
    
    [Required] 
    public int[] WorkDays { get; set; } = Array.Empty<int>();
}