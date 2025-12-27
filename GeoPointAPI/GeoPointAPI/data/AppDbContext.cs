using GeoPointAPI.Models;
using GeoPointAPI.Enums;
using Microsoft.EntityFrameworkCore; 

namespace GeoPointAPI.data; 
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    
    public DbSet<User> Users { get; set; }
    public DbSet<Location> Locations { get; set; }
    public DbSet<WorkSchedules> WorkSchedules { get; set; }
    public DbSet<TimeEntry> TimeEntries { get; set; }
    public DbSet<DailyBalance>  DailyBalances { get; set; }
    public DbSet<Request> Requests { get; set; }
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasConversion<string>(); // Salva "ADMIN" no banco, lê como UserRole.Admin

        modelBuilder.Entity<User>()
            .Property(u => u.Status)
            .HasConversion<string>();
        
        modelBuilder.Entity<Location>()
            .Property(l => l.Type)
            .HasConversion<string>();

        modelBuilder.Entity<Location>()
            .Property(l => l.Latitude)
            .HasPrecision(10, 8);

        modelBuilder.Entity<Location>()
            .Property(l => l.Longitude)
            .HasPrecision(11, 8);
        
        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.Type)
            .HasConversion<string>();
        
        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.Origin)
            .HasConversion<string>();
        
        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.LatitudeRecorded)
            .HasPrecision(10, 8);
        
        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.LongitudeRecorded)
            .HasPrecision(11, 8);

        modelBuilder.Entity<TimeEntry>()
            .Property(t => t.TimestampUtc)
            .HasColumnType("timestamptz");

        modelBuilder.Entity<DailyBalance>()
            .Property(d => d.ReferenceDate)
            .HasColumnType("date");
        
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
            .WithMany() // Um usuário gera muitos logs
            .HasForeignKey(a => a.ActorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}