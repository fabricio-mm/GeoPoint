using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoPointAPI.Models;

[Table("WORK_SCHEDULES")]
public class WorkSchedules
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }
    
    [Column("name")]
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Column("daily_hours_target")]
    public TimeSpan DailyHoursTarget { get; set; }
    
    [Column("tolerance_minutes")]
    public int ToleranceMinutes { get; set; }

    [Column("work_days")]
    public int[] WorkDays { get; set; } = Array.Empty<int>();
    
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}