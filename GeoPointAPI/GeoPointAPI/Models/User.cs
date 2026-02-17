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

    [Column("department")]
    [Required]
    public Department Department { get; set; }

    [Column("jobtitle")]
    [Required]
    public JobTitle JobTitle { get; set; }

    [Column("status")]
    [Required]
    public UserStatus Status { get; set; }

    // ⚠️ MUDANÇA PRINCIPAL: De Guid para o Enum WorkScheduleType
    // O banco vai salvar como INT (0, 1, 2)
    [Column("work_schedule_id")]
    public WorkScheduleType WorkScheduleId { get; set; }

    // ⚠️ AJUSTE DE SEGURANÇA: De Password para PasswordHash
    // Para armazenar o hash SHA256 e não a senha em texto puro
    [Column("password")]
    [Required]
    public string Password { get; set; } = string.Empty;

    // Relacionamento (Navigation Property)
    // Certifique-se que o nome da classe da escala é 'WorkSchedule' (singular) ou 'WorkSchedules' (plural) conforme você definiu
    [ForeignKey("WorkScheduleId")]
    public virtual WorkSchedule? WorkSchedule { get; set; }

    public virtual ICollection<Location>? Locations { get; set; } = new List<Location>();
}
