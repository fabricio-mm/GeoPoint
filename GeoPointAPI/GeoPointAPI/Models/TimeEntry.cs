using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GeoPointAPI.Enums;

namespace GeoPointAPI.Models;

[Table("TIME_ENTRIES")]
public class TimeEntry
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }
    
    [Column("user_id")]
    public Guid UserId { get; set; }
    
    [Column("timestamp_utc")]
    [Required]
    public DateTime TimestampUtc { get; set; }
    
    [Column("type")]
    [Required]
    public TimeEntryType Type { get; set; }
    
    [Column("origin")]
    [Required]
    public TimeEntryOrigin Origin { get; set; }
    
    [Column("latitude_recorded", TypeName = "decimal(10, 8)")]
    public decimal LatitudeRecorded { get; set; }

    [Column("longitude_recorded", TypeName = "decimal(11, 8)")]
    public decimal LongitudeRecorded { get; set; }

    [Column("is_manual_adjustment")]
    public bool IsManualAdjustment { get; set; } = false;

    // Propriedade de Navegação
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}