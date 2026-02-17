using GeoPointAPI.Models;
using GeoPointAPI.Enums;
using Microsoft.EntityFrameworkCore;

namespace GeoPointAPI.data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Location> Locations { get; set; }
    public DbSet<WorkSchedule> WorkSchedules { get; set; }
    public DbSet<TimeEntry> TimeEntries { get; set; }
    public DbSet<DailyBalance> DailyBalances { get; set; }
    public DbSet<Request> Requests { get; set; }
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ============================================================
        // 1. CONFIGURAÇÕES DE ENUMS (SALVAR COMO TEXTO) 📝
        // ============================================================

        // USER
        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasConversion<string>();

        modelBuilder.Entity<User>()
            .Property(u => u.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Request>().HasQueryFilter(r => !r.IsDeleted);
        modelBuilder.Entity<Attachment>().HasQueryFilter(a => !a.IsDeleted);
            base.OnModelCreating(modelBuilder);

        // 👇 NOVOS: Para salvar "Manager" e "IT"
        modelBuilder.Entity<User>()
            .Property(u => u.JobTitle)
            .HasConversion<string>();

        modelBuilder.Entity<User>()
            .Property(u => u.Department)
            .HasConversion<string>();

        // WORK SCHEDULE (PK como String para FK ficar legível)
        modelBuilder.Entity<WorkSchedule>()
            .Property(w => w.Id)
            .HasConversion<string>();

        // OUTROS ENUMS
        modelBuilder.Entity<Location>()
            .Property(l => l.Type)
            .HasConversion<string>();

        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.Type)
            .HasConversion<string>();

        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.Origin)
            .HasConversion<string>();

        // ============================================================
        // 2. PRECISÃO E TIPOS DE DADOS 🎯
        // ============================================================

        modelBuilder.Entity<Location>()
            .Property(l => l.Latitude)
            .HasPrecision(10, 8);

        modelBuilder.Entity<Location>()
            .Property(l => l.Longitude)
            .HasPrecision(11, 8);

        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.LatitudeRecorded)
            .HasPrecision(10, 8);

        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.LongitudeRecorded)
            .HasPrecision(11, 8);

        modelBuilder.Entity<TimeEntry>()
            .Property(t => t.TimestampUtc)
            .HasColumnType("timestamptz"); // PostgreSQL Timestamp com Timezone

        modelBuilder.Entity<DailyBalance>()
            .Property(d => d.ReferenceDate)
            .HasColumnType("date"); // Apenas data, sem hora

        // ============================================================
        // 3. RELACIONAMENTOS (FOREIGN KEYS) 🔗
        // ============================================================

        modelBuilder.Entity<Request>()
            .HasOne(r => r.Requester)
            .WithMany()
            .HasForeignKey(r => r.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Request>()
            .HasOne(r => r.Reviewer)
            .WithMany()
            .HasForeignKey(r => r.ReviewerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.Actor)
            .WithMany()
            .HasForeignKey(a => a.ActorId)
            .OnDelete(DeleteBehavior.Restrict);

        // ============================================================
        // 4. SEEDING (DADOS INICIAIS) 🌱
        // ============================================================

        // O EF Core vai converter os IDs (Enums) para String automaticamente
        // graças à configuração .HasConversion<string>() feita acima.
        modelBuilder.Entity<WorkSchedule>().HasData(
            new WorkSchedule
            {
                Id = WorkScheduleType.Comercial,
                Name = "Comercial (08h-18h)",
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(18, 0, 0),
                ToleranceMinutes = 10,
                WorkDays = new [] { 1, 2, 3, 4, 5 } // Seg-Sex
            },
            new WorkSchedule
            {
                Id = WorkScheduleType.Intern,
                Name = "Intern (08h-15h)",
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(15, 0, 0),
                ToleranceMinutes = 15,
                WorkDays = new [] { 1, 2, 3, 4, 5 }
            },
            new WorkSchedule
            {
                Id = WorkScheduleType.Contractor,
                Name = "Contractor (09h-18h)",
                StartTime = new TimeSpan(9, 0, 0),
                EndTime = new TimeSpan(18, 0, 0),
                ToleranceMinutes = 5,
                WorkDays = new [] { 1, 2, 3, 4, 5 }
            }
        );
    }
}
