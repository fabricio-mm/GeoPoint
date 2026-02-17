using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GeoPointAPI.Enums;

namespace GeoPointAPI.Models;

[Table("WORK_SCHEDULES")]
public class WorkSchedule
{
    // 1. A PK agora é o seu Enum (0, 1, 2)
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)] // Obrigatório para Enums!
    [Column("id")]
    public WorkScheduleType Id { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    // 2. Adicionamos Start/End (Vital para saber se está atrasado)
    [Column("start_time")]
    public TimeSpan StartTime { get; set; }

    [Column("end_time")]
    public TimeSpan EndTime { get; set; }

    // 3. Mantivemos da sua model antiga (Muito úteis!)
    [Column("tolerance_minutes")]
    public int ToleranceMinutes { get; set; } = 10; // Padrão 10 min

    // Array de int no Postgres é nativo. No SQL Server precisa de conversão,
    // mas vamos assumir que você está usando uma abordagem simples por enquanto.
    // 0=Dom, 1=Seg, ... 6=Sab
    [Column("work_days")]
    public int[] WorkDays { get; set; } = new int[] { 1, 2, 3, 4, 5 }; // Seg a Sex

    // Relacionamento
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
