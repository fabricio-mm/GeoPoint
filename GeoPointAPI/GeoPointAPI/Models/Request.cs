using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Net.Mail;
using GeoPointAPI.Enums;

namespace GeoPointAPI.Models;

[Table("REQUESTS")]
public class Request
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("requester_id")]
    public Guid RequesterId { get; set; }

    [Column("reviewer_id")]
    public Guid? ReviewerId { get; set; }

    [Column("type")]
    [Required]
    public RequestType Type { get; set; }

    [Column("target_date", TypeName = "date")]
    public DateTime TargetDate { get; set; }

    [Column("status")]
    [Required]
    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    [Column("justification_user")]
    public string? JustificationUser { get; set; } // "text" no banco pode ser string grande aqui

    [Column("justification_reviewer")]
    public string? JustificationReviewer { get; set; }

    public bool IsDeleted { get; set; } = false;

    public DateTime? DeletedAt { get; set; }

    // --- PROPRIEDADES DE NAVEGAÇÃO ---

    [ForeignKey("RequesterId")]
    public virtual User? Requester { get; set; }

    [ForeignKey("ReviewerId")]
    public virtual User? Reviewer { get; set; }

    public virtual ICollection<Attachment>? Attachments { get; set; } = new List<Attachment>();
}
