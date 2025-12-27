using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoPointAPI.Models;

[Table("AUDIT_LOGS")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("actor_id")]
    public Guid ActorId { get; set; } // Quem fez a ação

    [Column("action")]
    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty; // Ex: "CREATE", "UPDATE", "DELETE"

    [Column("entity_affected")]
    [Required]
    [MaxLength(100)]
    public string EntityAffected { get; set; } = string.Empty; // Ex: "User", "Location"

    // JSONB: Guardamos como string no C#, mas o Postgres entende como JSON estruturado.
    // Isso permite salvar qualquer objeto aqui dentro.
    [Column("old_value", TypeName = "jsonb")]
    public string? OldValue { get; set; } 

    [Column("new_value", TypeName = "jsonb")]
    public string? NewValue { get; set; }

    // ADICIONAL: Essencial para ordenar os logs cronologicamente
    [Column("timestamp_utc", TypeName = "timestamptz")]
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    // Propriedade de Navegação
    [ForeignKey("ActorId")]
    public virtual User? Actor { get; set; }
}