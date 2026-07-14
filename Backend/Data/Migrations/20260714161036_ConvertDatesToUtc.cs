using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tabibi.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConvertDatesToUtc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DECLARE @sql NVARCHAR(MAX) = '';

SELECT @sql += 'UPDATE [' + t.name + '] SET [' + c.name + '] = DATEADD(hour, 3, [' + c.name + ']) WHERE [' + c.name + '] IS NOT NULL;' + CHAR(13) + CHAR(10)
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE ty.name IN ('datetime', 'datetime2')

EXEC sp_executesql @sql;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DECLARE @sql NVARCHAR(MAX) = '';

SELECT @sql += 'UPDATE [' + t.name + '] SET [' + c.name + '] = DATEADD(hour, -3, [' + c.name + ']) WHERE [' + c.name + '] IS NOT NULL;' + CHAR(13) + CHAR(10)
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE ty.name IN ('datetime', 'datetime2')

EXEC sp_executesql @sql;
            ");
        }
    }
}
