using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DairyFarm.Api.Data;

/// <summary>
/// EF Core context for the canonical `dairy farm 1` database.
///
/// This context maps the 49 VERIFIED tables and NEVER creates, alters or drops
/// anything. There is no EnsureCreated / Migrate call anywhere in the API and
/// no DDL is executed at startup: the schema is owned by
/// backend/SQL/021_canonical_schema.sql, which has already been applied.
///
/// Design invariants enforced here:
///   * Farm isolation: every operational entity carries farm_id and is reached
///     through Farm, so a query can always be scoped to one farm.
///   * Milk is session based: MilkRecord holds one row per session and the
///     unique (animal_id, record_date, session) is configured, so daily totals
///     are derived by SUM rather than stored.
///   * Animal codes are unique per farm, not globally.
///   * Finance is one ledger typed INCOME / EXPENSE.
///   * Stock is a signed transaction ledger, never a mutable balance column.
///   * Delete behaviours mirror the database exactly, so history is not lost
///     (audit_logs.user_id and animal_mortalities.animal_id are non-cascading).
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // --- Core: companies -> farms -> sheds -> animal_groups -> animals ------
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Farm> Farms => Set<Farm>();
    public DbSet<Shed> Sheds => Set<Shed>();
    public DbSet<AnimalGroup> AnimalGroups => Set<AnimalGroup>();
    public DbSet<Breed> Breeds => Set<Breed>();

    // --- Auth / RBAC --------------------------------------------------------
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<User> Users => Set<User>();
    public DbSet<FarmUserAccess> FarmUserAccess => Set<FarmUserAccess>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();

    // --- Animals ------------------------------------------------------------
    public DbSet<Animal> Animals => Set<Animal>();
    public DbSet<AnimalStatusHistory> AnimalStatusHistories => Set<AnimalStatusHistory>();
    public DbSet<AnimalPhoto> AnimalPhotos => Set<AnimalPhoto>();
    public DbSet<AnimalCodeSequence> AnimalCodeSequences => Set<AnimalCodeSequence>();

    // --- Milk ---------------------------------------------------------------
    public DbSet<Lactation> Lactations => Set<Lactation>();
    public DbSet<MilkRecord> MilkRecords => Set<MilkRecord>();
    public DbSet<MilkBuyer> MilkBuyers => Set<MilkBuyer>();
    public DbSet<MilkSale> MilkSales => Set<MilkSale>();

    // --- Reproduction -------------------------------------------------------
    public DbSet<BreedingEvent> BreedingEvents => Set<BreedingEvent>();
    public DbSet<Pregnancy> Pregnancies => Set<Pregnancy>();
    public DbSet<Calving> Calvings => Set<Calving>();
    public DbSet<Calf> Calves => Set<Calf>();

    // --- Health -------------------------------------------------------------
    public DbSet<Disease> Diseases => Set<Disease>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<HealthRecord> HealthRecords => Set<HealthRecord>();
    public DbSet<Treatment> Treatments => Set<Treatment>();
    public DbSet<VaccinationRecord> VaccinationRecords => Set<VaccinationRecord>();

    // --- Feed / inventory ---------------------------------------------------
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<FeedItem> FeedItems => Set<FeedItem>();
    public DbSet<FeedTransaction> FeedTransactions => Set<FeedTransaction>();
    public DbSet<RationPlan> RationPlans => Set<RationPlan>();
    public DbSet<RationPlanItem> RationPlanItems => Set<RationPlanItem>();
    public DbSet<FeedConsumption> FeedConsumptions => Set<FeedConsumption>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();

    // --- Trade --------------------------------------------------------------
    public DbSet<AnimalPurchase> AnimalPurchases => Set<AnimalPurchase>();
    public DbSet<AnimalSale> AnimalSales => Set<AnimalSale>();
    public DbSet<AnimalMortality> AnimalMortalities => Set<AnimalMortality>();

    // --- Finance (one ledger) ----------------------------------------------
    public DbSet<FinanceCategory> FinanceCategories => Set<FinanceCategory>();
    public DbSet<FinanceTransaction> FinanceTransactions => Set<FinanceTransaction>();

    // --- Tasks / alerts / notifications -------------------------------------
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<Notification> Notifications => Set<Notification>();

    // --- System -------------------------------------------------------------
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<FarmSetting> FarmSettings => Set<FarmSetting>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // -------------------------------------------------------------------
        // Core hierarchy
        // -------------------------------------------------------------------
        b.Entity<Company>(e =>
        {
            e.HasKey(x => x.CompanyId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasMany(x => x.Farms).WithOne(f => f.Company!)
                .HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Farm>(e =>
        {
            e.HasKey(x => x.FarmId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasIndex(x => x.Code).IsUnique().HasDatabaseName("uq_farms_code");
            e.HasOne(x => x.Settings).WithOne(s => s.Farm!)
                .HasForeignKey<FarmSetting>(x => x.FarmId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Shed>(e =>
        {
            e.HasKey(x => x.ShedId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasIndex(x => new { x.FarmId, x.Name }).IsUnique().HasDatabaseName("uq_sheds_farm_name");
            e.HasOne(x => x.Farm).WithMany(f => f.Sheds)
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Groups).WithOne(g => g.Shed)
                .HasForeignKey(x => x.ShedId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<AnimalGroup>(e =>
        {
            e.HasKey(x => x.GroupId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.Property(x => x.AnimalType).HasDefaultValue("COW");
            e.HasIndex(x => new { x.FarmId, x.Name }).IsUnique().HasDatabaseName("uq_groups_farm_name");
            e.HasOne(x => x.Farm).WithMany(f => f.Groups)
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Shed).WithMany(s => s.Groups)
                .HasForeignKey(x => x.ShedId).OnDelete(DeleteBehavior.SetNull);
            e.HasMany(x => x.Animals).WithOne(a => a.Group)
                .HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Breed>(e =>
        {
            e.HasKey(x => x.BreedId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasIndex(x => x.Name).IsUnique().HasDatabaseName("uq_breeds_name");
            e.HasMany(x => x.Animals).WithOne(a => a.Breed)
                .HasForeignKey(x => x.BreedId).OnDelete(DeleteBehavior.SetNull);
        });

        // -------------------------------------------------------------------
        // Auth / RBAC
        // -------------------------------------------------------------------
        b.Entity<Role>(e =>
        {
            e.HasKey(x => x.RoleId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasIndex(x => x.Name).IsUnique().HasDatabaseName("uq_roles_name");
            e.HasMany(x => x.Permissions).WithOne(rp => rp.Role)
                .HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Permission>(e =>
        {
            e.HasKey(x => x.PermissionId);
            e.HasIndex(x => x.Name).IsUnique().HasDatabaseName("uq_permissions_name");
            e.HasMany(x => x.Roles).WithOne(rp => rp.Permission)
                .HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<RolePermission>(e =>
        {
            e.HasKey(x => new { x.RoleId, x.PermissionId });
        });

        b.Entity<User>(e =>
        {
            e.HasKey(x => x.UserId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasIndex(x => x.Username).IsUnique().HasDatabaseName("uq_users_username");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Role).WithMany(r => r.Users)
                .HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.FarmAccess).WithOne(f => f.User)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Sessions).WithOne(s => s.User)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<FarmUserAccess>(e =>
        {
            e.HasKey(x => new { x.UserId, x.FarmId });
            e.Property(x => x.AccessLevel).HasDefaultValue("READ");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<UserSession>(e =>
        {
            e.HasKey(x => x.SessionId);
            e.HasIndex(x => x.SessionToken).IsUnique().HasDatabaseName("uq_sessions_token");
        });

        b.Entity<ApiKey>(e =>
        {
            e.HasKey(x => x.ApiKeyId);
            e.HasIndex(x => x.KeyHash).IsUnique().HasDatabaseName("uq_api_keys_hash");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany()
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        // -------------------------------------------------------------------
        // Animals
        // -------------------------------------------------------------------
        b.Entity<Animal>(e =>
        {
            e.HasKey(x => x.AnimalId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.Property(x => x.Sex).HasDefaultValue("FEMALE");

            e.HasIndex(x => new { x.FarmId, x.AnimalCode })
                .IsUnique().HasDatabaseName("uq_animals_farm_code");
            e.HasIndex(x => x.QrToken).IsUnique().HasDatabaseName("uq_animals_qr_token");

            e.HasOne(x => x.Farm).WithMany(f => f.Animals)
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Shed).WithMany()
                .HasForeignKey(x => x.ShedId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Group).WithMany(g => g.Animals)
                .HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Breed).WithMany(br => br.Animals)
                .HasForeignKey(x => x.BreedId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Dam).WithMany()
                .HasForeignKey(x => x.DamId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Sire).WithMany()
                .HasForeignKey(x => x.SireId).OnDelete(DeleteBehavior.SetNull);

            e.HasMany(x => x.Photos).WithOne(p => p.Animal)
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.StatusHistory).WithOne(h => h.Animal)
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Lactations).WithOne(l => l.Animal)
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.MilkRecords).WithOne(m => m.Animal)
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<AnimalStatusHistory>(e => e.HasKey(x => x.StatusHistoryId));

        b.Entity<AnimalPhoto>(e =>
        {
            e.HasKey(x => x.PhotoId);
            e.Property(x => x.ImageData).HasColumnType("longblob");
            e.Property(x => x.IsPrimary).HasColumnType("tinyint(1)");
        });

        b.Entity<AnimalCodeSequence>(e =>
        {
            e.HasKey(x => x.FarmId);
            e.Property(x => x.Prefix).HasDefaultValue("AN-");
            e.Property(x => x.NextNumber).HasDefaultValue(1UL);
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        // -------------------------------------------------------------------
        // Milk (session based)
        // -------------------------------------------------------------------
        b.Entity<Lactation>(e =>
        {
            e.HasKey(x => x.LactationId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasIndex(x => new { x.AnimalId, x.LactationNumber })
                .IsUnique().HasDatabaseName("uq_lactations_animal_no");
        });

        b.Entity<MilkRecord>(e =>
        {
            e.HasKey(x => x.MilkRecordId);
            e.Property(x => x.Session).HasDefaultValue("MORNING");
            e.Property(x => x.MilkLiters).HasPrecision(8, 2);
            e.Property(x => x.IsRejected).HasColumnType("tinyint(1)");

            e.HasIndex(x => new { x.AnimalId, x.RecordDate, x.Session })
                .IsUnique().HasDatabaseName("uq_milk_animal_date_session");

            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Lactation).WithMany(l => l.MilkRecords)
                .HasForeignKey(x => x.LactationId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<MilkBuyer>(e =>
        {
            e.HasKey(x => x.BuyerId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.Property(x => x.BuyerType).HasDefaultValue("LOCAL_SHOP");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.MilkSales).WithOne(s => s.Buyer)
                .HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<MilkSale>(e =>
        {
            e.HasKey(x => x.MilkSaleId);
            e.Property(x => x.MilkQuantityLiters).HasPrecision(10, 2);
            e.Property(x => x.PricePerLiter).HasPrecision(10, 2);
            e.Property(x => x.TotalAmount).HasPrecision(14, 2);
            e.Property(x => x.AmountPaid).HasPrecision(14, 2);
            e.Property(x => x.AmountDue).HasPrecision(14, 2);
            e.Property(x => x.PaymentMethod).HasDefaultValue("CASH");
            e.Property(x => x.PaymentStatus).HasDefaultValue("PAID");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        // -------------------------------------------------------------------
        // Reproduction
        // -------------------------------------------------------------------
        b.Entity<BreedingEvent>(e =>
        {
            e.HasKey(x => x.BreedingEventId);
            e.Property(x => x.EventType).HasDefaultValue("HEAT");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ServiceAnimal).WithMany()
                .HasForeignKey(x => x.ServiceAnimalId).OnDelete(DeleteBehavior.SetNull);
            e.HasMany(x => x.Pregnancies).WithOne(p => p.BreedingEvent)
                .HasForeignKey(x => x.BreedingEventId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Pregnancy>(e =>
        {
            e.HasKey(x => x.PregnancyId);
            e.Property(x => x.Status).HasDefaultValue("CONFIRMED");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Calvings).WithOne(c => c.Pregnancy)
                .HasForeignKey(x => x.PregnancyId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Calving>(e =>
        {
            e.HasKey(x => x.CalvingId);
            e.Property(x => x.CalvingType).HasDefaultValue("NORMAL");
            e.Property(x => x.CalvingStatus).HasDefaultValue("COMPLETED");
            e.Property(x => x.CalfCount).HasDefaultValue(1);
            e.Property(x => x.ColostrumGiven).HasColumnType("tinyint(1)");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Calves).WithOne(c => c.Calving)
                .HasForeignKey(x => x.CalvingId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Calf>(e =>
        {
            e.HasKey(x => x.CalfId);
            e.Property(x => x.Sex).HasDefaultValue("FEMALE");
            e.Property(x => x.Outcome).HasDefaultValue("ALIVE");
            e.Property(x => x.ColostrumReceived).HasColumnType("tinyint(1)");
            e.HasIndex(x => new { x.FarmId, x.CalfNumber })
                .IsUnique().HasDatabaseName("uq_calves_number");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.CalfAnimal).WithMany()
                .HasForeignKey(x => x.CalfAnimalId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Dam).WithMany()
                .HasForeignKey(x => x.DamId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Sire).WithMany()
                .HasForeignKey(x => x.SireId).OnDelete(DeleteBehavior.SetNull);
        });

        // -------------------------------------------------------------------
        // Health
        // -------------------------------------------------------------------
        b.Entity<Disease>(e =>
        {
            e.HasKey(x => x.DiseaseId);
            e.Property(x => x.IsActive).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.HasIndex(x => x.Name).IsUnique().HasDatabaseName("uq_diseases_name");
            e.HasMany(x => x.HealthRecords).WithOne(h => h.Disease)
                .HasForeignKey(x => x.DiseaseId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Medicine>(e =>
        {
            e.HasKey(x => x.MedicineId);
            e.Property(x => x.IsActive).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.Property(x => x.WithdrawalMilkHours).HasDefaultValue(0);
            e.Property(x => x.WithdrawalMeatDays).HasDefaultValue(0);
            e.HasIndex(x => x.Name).IsUnique().HasDatabaseName("uq_medicines_name");
            e.HasMany(x => x.Treatments).WithOne(t => t.Medicine)
                .HasForeignKey(x => x.MedicineId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<HealthRecord>(e =>
        {
            e.HasKey(x => x.HealthRecordId);
            e.Property(x => x.RecordType).HasDefaultValue("ILLNESS");
            e.Property(x => x.Status).HasDefaultValue("OPEN");
            e.Property(x => x.IsWithdrawal).HasColumnType("tinyint(1)");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Treatments).WithOne(t => t.HealthRecord)
                .HasForeignKey(x => x.HealthRecordId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Treatment>(e =>
        {
            e.HasKey(x => x.TreatmentId);
            e.Property(x => x.TreatmentStatus).HasDefaultValue("ONGOING");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Disease).WithMany()
                .HasForeignKey(x => x.DiseaseId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<VaccinationRecord>(e =>
        {
            e.HasKey(x => x.VaccinationId);
            e.Property(x => x.Status).HasDefaultValue("COMPLETED");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Group).WithMany()
                .HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.SetNull);
        });

        // -------------------------------------------------------------------
        // Feed / inventory (signed transaction ledgers)
        // -------------------------------------------------------------------
        b.Entity<Supplier>(e =>
        {
            e.HasKey(x => x.SupplierId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.FeedTransactions).WithOne(t => t.Supplier)
                .HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.SetNull);
            e.HasMany(x => x.InventoryTransactions).WithOne(t => t.Supplier)
                .HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<FeedItem>(e =>
        {
            e.HasKey(x => x.FeedItemId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.Property(x => x.Unit).HasDefaultValue("KG");
            e.HasIndex(x => new { x.FarmId, x.Name })
                .IsUnique().HasDatabaseName("uq_feed_items_farm_name");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Transactions).WithOne(t => t.FeedItem)
                .HasForeignKey(x => x.FeedItemId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Consumptions).WithOne(t => t.FeedItem)
                .HasForeignKey(x => x.FeedItemId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.RationPlanItems).WithOne(t => t.FeedItem)
                .HasForeignKey(x => x.FeedItemId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<FeedTransaction>(e =>
        {
            e.HasKey(x => x.FeedTransactionId);
            e.Property(x => x.TransactionType).HasDefaultValue("PURCHASE");
            e.Property(x => x.Quantity).HasPrecision(12, 3);
            e.Property(x => x.UnitCost).HasPrecision(12, 2);
            e.Property(x => x.TotalCost).HasPrecision(14, 2);
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<RationPlan>(e =>
        {
            e.HasKey(x => x.RationPlanId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.HasIndex(x => new { x.FarmId, x.Name })
                .IsUnique().HasDatabaseName("uq_ration_farm_name");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Group).WithMany()
                .HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Items).WithOne(i => i.RationPlan)
                .HasForeignKey(x => x.RationPlanId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Consumptions).WithOne(c => c.RationPlan)
                .HasForeignKey(x => x.RationPlanId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<RationPlanItem>(e =>
        {
            e.HasKey(x => x.RationPlanItemId);
            e.Property(x => x.QuantityPerDay).HasPrecision(12, 3);
            e.HasIndex(x => new { x.RationPlanId, x.FeedItemId })
                .IsUnique().HasDatabaseName("uq_ration_item");
        });

        b.Entity<FeedConsumption>(e =>
        {
            e.HasKey(x => x.FeedConsumptionId);
            e.Property(x => x.Quantity).HasPrecision(12, 3);
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Group).WithMany()
                .HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<InventoryItem>(e =>
        {
            e.HasKey(x => x.InventoryItemId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.Property(x => x.Unit).HasDefaultValue("PCS");
            e.HasIndex(x => new { x.FarmId, x.Name })
                .IsUnique().HasDatabaseName("uq_inventory_farm_name");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Transactions).WithOne(t => t.InventoryItem)
                .HasForeignKey(x => x.InventoryItemId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<InventoryTransaction>(e =>
        {
            e.HasKey(x => x.InventoryTransactionId);
            e.Property(x => x.TransactionType).HasDefaultValue("PURCHASE");
            e.Property(x => x.Quantity).HasPrecision(12, 3);
            e.Property(x => x.UnitCost).HasPrecision(12, 2);
            e.Property(x => x.TotalCost).HasPrecision(14, 2);
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
        });

        // -------------------------------------------------------------------
        // Trade
        // -------------------------------------------------------------------
        b.Entity<AnimalPurchase>(e =>
        {
            e.HasKey(x => x.PurchaseId);
            e.Property(x => x.PurchasePrice).HasPrecision(14, 2);
            e.Property(x => x.TransportCost).HasPrecision(14, 2).HasDefaultValue(0m);
            e.Property(x => x.VeterinaryCost).HasPrecision(14, 2).HasDefaultValue(0m);
            e.Property(x => x.LandedCost).HasPrecision(14, 2);
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Supplier).WithMany()
                .HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<AnimalSale>(e =>
        {
            e.HasKey(x => x.SaleId);
            e.Property(x => x.SalePrice).HasPrecision(14, 2);
            e.Property(x => x.WeightKg).HasPrecision(8, 2);
            e.Property(x => x.CostBasis).HasPrecision(14, 2);
            e.Property(x => x.ProfitLoss).HasPrecision(14, 2);
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Buyer).WithMany()
                .HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<AnimalMortality>(e =>
        {
            e.HasKey(x => x.MortalityId);
            e.Property(x => x.PostMortemDone).HasColumnType("tinyint(1)");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Restrict);
        });

        // -------------------------------------------------------------------
        // Finance - ONE ledger typed INCOME / EXPENSE
        // -------------------------------------------------------------------
        b.Entity<FinanceCategory>(e =>
        {
            e.HasKey(x => x.CategoryId);
            e.Property(x => x.Status).HasDefaultValue("ACTIVE");
            e.Property(x => x.CategoryType).HasDefaultValue("EXPENSE");
            e.HasIndex(x => new { x.FarmId, x.Name })
                .IsUnique().HasDatabaseName("uq_fin_cat_farm_name");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Transactions).WithOne(t => t.Category)
                .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<FinanceTransaction>(e =>
        {
            e.HasKey(x => x.FinanceTransactionId);
            e.Property(x => x.TransactionType).HasDefaultValue("EXPENSE");
            e.Property(x => x.Amount).HasPrecision(14, 2);
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Supplier).WithMany()
                .HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Buyer).WithMany()
                .HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.SetNull);
        });

        // -------------------------------------------------------------------
        // Tasks / alerts / notifications
        // -------------------------------------------------------------------
        b.Entity<TaskItem>(e =>
        {
            e.HasKey(x => x.TaskId);
            e.Property(x => x.TaskType).HasDefaultValue("OTHER");
            e.Property(x => x.Priority).HasDefaultValue("MEDIUM");
            e.Property(x => x.Status).HasDefaultValue("PENDING");
            e.Property(x => x.DueTime).HasColumnType("time");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Group).WithMany()
                .HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.AssignedUser).WithMany()
                .HasForeignKey(x => x.AssignedTo).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Alert>(e =>
        {
            e.HasKey(x => x.AlertId);
            e.Property(x => x.AlertType).HasDefaultValue("OTHER");
            e.Property(x => x.Severity).HasDefaultValue("INFO");
            e.Property(x => x.IsRead).HasColumnType("tinyint(1)");
            e.Property(x => x.IsResolved).HasColumnType("tinyint(1)");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Animal).WithMany()
                .HasForeignKey(x => x.AnimalId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Notifications).WithOne(n => n.Alert)
                .HasForeignKey(x => x.AlertId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Notification>(e =>
        {
            e.HasKey(x => x.NotificationId);
            e.Property(x => x.IsRead).HasColumnType("tinyint(1)");
            e.Property(x => x.IsDone).HasColumnType("tinyint(1)");
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany()
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // -------------------------------------------------------------------
        // System
        // -------------------------------------------------------------------
        b.Entity<Attachment>(e =>
        {
            e.HasKey(x => x.AttachmentId);
            e.HasOne(x => x.Farm).WithMany()
                .HasForeignKey(x => x.FarmId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.UploadedByUser).WithMany()
                .HasForeignKey(x => x.UploadedBy).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<AuditLog>(e =>
        {
            e.HasKey(x => x.AuditLogId);
            e.Property(x => x.OldValues).HasColumnType("longtext");
            e.Property(x => x.NewValues).HasColumnType("longtext");
            e.HasOne(x => x.User).WithMany()
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<SystemSetting>(e =>
        {
            e.HasKey(x => x.SystemSettingId);
            e.Property(x => x.SettingValue).HasColumnType("text");
            e.Property(x => x.DataType).HasDefaultValue("string");
            e.HasIndex(x => x.SettingKey).IsUnique().HasDatabaseName("uq_system_settings_key");
        });

        b.Entity<FarmSetting>(e =>
        {
            e.HasKey(x => x.FarmSettingId);
            e.Property(x => x.Currency).HasDefaultValue("PKR");
            e.Property(x => x.Timezone).HasDefaultValue("Asia/Karachi");
            e.Property(x => x.MilkUnit).HasDefaultValue("LITER");
            e.Property(x => x.DateFormat).HasDefaultValue("yyyy-MM-dd");
            e.Property(x => x.MilkDropThresholdPercent).HasPrecision(5, 2).HasDefaultValue(20.00m);
            e.Property(x => x.LowStockAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.Property(x => x.VaccinationAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.Property(x => x.HealthFollowUpAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.Property(x => x.PregnancyAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.Property(x => x.TaskAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.Property(x => x.MilkDropAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.Property(x => x.AuditLoggingEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
            e.HasIndex(x => x.FarmId).IsUnique().HasDatabaseName("uq_farm_settings_farm");
        });
    }
}
