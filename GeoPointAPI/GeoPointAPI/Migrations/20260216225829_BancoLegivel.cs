using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GeoPointAPI.Migrations
{
    /// <inheritdoc />
    public partial class BancoLegivel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WORK_SCHEDULES",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    start_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    end_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    tolerance_minutes = table.Column<int>(type: "integer", nullable: false),
                    work_days = table.Column<int[]>(type: "integer[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WORK_SCHEDULES", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "USERS",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    department = table.Column<string>(type: "text", nullable: false),
                    jobtitle = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    work_schedule_id = table.Column<string>(type: "text", nullable: false),
                    password = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_USERS", x => x.id);
                    table.ForeignKey(
                        name: "FK_USERS_WORK_SCHEDULES_work_schedule_id",
                        column: x => x.work_schedule_id,
                        principalTable: "WORK_SCHEDULES",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AUDIT_LOGS",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity_affected = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    old_value = table.Column<string>(type: "jsonb", nullable: true),
                    new_value = table.Column<string>(type: "jsonb", nullable: true),
                    timestamp_utc = table.Column<DateTime>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AUDIT_LOGS", x => x.id);
                    table.ForeignKey(
                        name: "FK_AUDIT_LOGS_USERS_actor_id",
                        column: x => x.actor_id,
                        principalTable: "USERS",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DAILYBALANCES",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reference_date = table.Column<DateTime>(type: "date", nullable: false),
                    total_worked_minutes = table.Column<int>(type: "integer", nullable: false),
                    balance_minutes = table.Column<int>(type: "integer", nullable: false),
                    overtime_minutes = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DAILYBALANCES", x => x.id);
                    table.ForeignKey(
                        name: "FK_DAILYBALANCES_USERS_user_id",
                        column: x => x.user_id,
                        principalTable: "USERS",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LOCATIONS",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    latitude = table.Column<decimal>(type: "numeric(10,8)", precision: 10, scale: 8, nullable: false),
                    longitude = table.Column<decimal>(type: "numeric(11,8)", precision: 11, scale: 8, nullable: false),
                    radius_meters = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LOCATIONS", x => x.id);
                    table.ForeignKey(
                        name: "FK_LOCATIONS_USERS_user_id",
                        column: x => x.user_id,
                        principalTable: "USERS",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "REQUESTS",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    requester_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewer_id = table.Column<Guid>(type: "uuid", nullable: true),
                    type = table.Column<int>(type: "integer", nullable: false),
                    target_date = table.Column<DateTime>(type: "date", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    justification_user = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_REQUESTS", x => x.id);
                    table.ForeignKey(
                        name: "FK_REQUESTS_USERS_requester_id",
                        column: x => x.requester_id,
                        principalTable: "USERS",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_REQUESTS_USERS_reviewer_id",
                        column: x => x.reviewer_id,
                        principalTable: "USERS",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TIME_ENTRIES",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    timestamp_utc = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    origin = table.Column<string>(type: "text", nullable: false),
                    latitude_recorded = table.Column<decimal>(type: "numeric(10,8)", precision: 10, scale: 8, nullable: false),
                    longitude_recorded = table.Column<decimal>(type: "numeric(11,8)", precision: 11, scale: 8, nullable: false),
                    is_manual_adjustment = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TIME_ENTRIES", x => x.id);
                    table.ForeignKey(
                        name: "FK_TIME_ENTRIES_USERS_user_id",
                        column: x => x.user_id,
                        principalTable: "USERS",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ATTACHMENTS",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    file_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ATTACHMENTS", x => x.id);
                    table.ForeignKey(
                        name: "FK_ATTACHMENTS_REQUESTS_request_id",
                        column: x => x.request_id,
                        principalTable: "REQUESTS",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "WORK_SCHEDULES",
                columns: new[] { "id", "end_time", "name", "start_time", "tolerance_minutes", "work_days" },
                values: new object[,]
                {
                    { "Comercial", new TimeSpan(0, 18, 0, 0, 0), "Comercial (08h-18h)", new TimeSpan(0, 8, 0, 0, 0), 10, new[] { 1, 2, 3, 4, 5 } },
                    { "Contractor", new TimeSpan(0, 18, 0, 0, 0), "Contractor (09h-18h)", new TimeSpan(0, 9, 0, 0, 0), 5, new[] { 1, 2, 3, 4, 5 } },
                    { "Intern", new TimeSpan(0, 15, 0, 0, 0), "Intern (08h-15h)", new TimeSpan(0, 8, 0, 0, 0), 15, new[] { 1, 2, 3, 4, 5 } }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ATTACHMENTS_request_id",
                table: "ATTACHMENTS",
                column: "request_id");

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOGS_actor_id",
                table: "AUDIT_LOGS",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "IX_DAILYBALANCES_user_id",
                table: "DAILYBALANCES",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_LOCATIONS_user_id",
                table: "LOCATIONS",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_REQUESTS_requester_id",
                table: "REQUESTS",
                column: "requester_id");

            migrationBuilder.CreateIndex(
                name: "IX_REQUESTS_reviewer_id",
                table: "REQUESTS",
                column: "reviewer_id");

            migrationBuilder.CreateIndex(
                name: "IX_TIME_ENTRIES_user_id",
                table: "TIME_ENTRIES",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_USERS_work_schedule_id",
                table: "USERS",
                column: "work_schedule_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ATTACHMENTS");

            migrationBuilder.DropTable(
                name: "AUDIT_LOGS");

            migrationBuilder.DropTable(
                name: "DAILYBALANCES");

            migrationBuilder.DropTable(
                name: "LOCATIONS");

            migrationBuilder.DropTable(
                name: "TIME_ENTRIES");

            migrationBuilder.DropTable(
                name: "REQUESTS");

            migrationBuilder.DropTable(
                name: "USERS");

            migrationBuilder.DropTable(
                name: "WORK_SCHEDULES");
        }
    }
}
