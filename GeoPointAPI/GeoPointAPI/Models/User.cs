using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GeoPointAPI.Enums;

namespace GeoPointAPI.Models;
[Table("USERS")]
public class User
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("full_name")]
    [Required]
    [MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [Column("email")]
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Column("role")]
    [Required]
    public UserRole Role { get; set; } 

    [Column("status")]
    [Required]
    public UserStatus Status { get; set; } 

    [Column("work_schedule_id")]
    public Guid WorkScheduleId { get; set; }
    
    [ForeignKey("WorkScheduleId")]
    public virtual WorkSchedules? WorkSchedule { get; set; }
    
    public virtual ICollection<Location>? Locations { get; set; } = new List<Location>();
    
}