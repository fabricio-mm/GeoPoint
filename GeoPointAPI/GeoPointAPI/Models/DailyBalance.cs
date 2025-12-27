using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace GeoPointAPI.Models;

[Table("DAILYBALANCES")]

public class DailyBalance
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }
    
    [Column("user_id")]
    public Guid UserId { get; set; }
    
    [Column("reference_date", TypeName = "date")]
    public DateTime ReferenceDate { get; set; }
    
    [Column("total_worked_minutes")]
    public int TotalWorkedMinutes { get; set; }
    
    [Column("balance_minutes")]
    public int BalanceMinutes { get; set; }
    
    [Column("overtime_minutes")]
    public int OvertimeMinutes { get; set; }
    
    [Column("Status")]
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;
    
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}