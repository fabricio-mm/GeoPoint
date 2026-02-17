using System.ComponentModel.DataAnnotations;

namespace GeoPointAPI.DTOs;

public class UpdateWorkScheduleDto
{
    [Required]
    public string Name { get; set; } = String.Empty;

    [Required]
    public TimeSpan StartTime { get; set; }

    [Required]
    public TimeSpan EndTime { get; set; }

    public TimeSpan DailyHoursTarget { get; set; }

    public int ToleranceMinutes { get; set; } = 10;

    [Required]
    public int[] WorkDays { get; set; } = Array.Empty<int>();
}
