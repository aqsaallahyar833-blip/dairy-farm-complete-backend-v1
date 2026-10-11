using DairyFarm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DairyFarm.Api.Data;

public class AppDbContext : DbContext
{
	public DbSet<Company> Companies => Set<Company>();

	public DbSet<Farm> Farms => Set<Farm>();

	public DbSet<Shed> Sheds => Set<Shed>();

	public DbSet<AnimalGroup> AnimalGroups => Set<AnimalGroup>();

	public DbSet<Breed> Breeds => Set<Breed>();

	public DbSet<Role> Roles => Set<Role>();

	public DbSet<Permission> Permissions => Set<Permission>();

	public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

	public DbSet<User> Users => Set<User>();

	public DbSet<FarmUserAccess> FarmUserAccess => Set<FarmUserAccess>();

	public DbSet<UserSession> UserSessions => Set<UserSession>();

	public DbSet<ApiKey> ApiKeys => Set<ApiKey>();

	public DbSet<Animal> Animals => Set<Animal>();

	public DbSet<AnimalStatusHistory> AnimalStatusHistories => Set<AnimalStatusHistory>();

	public DbSet<AnimalPhoto> AnimalPhotos => Set<AnimalPhoto>();

	public DbSet<AnimalCodeSequence> AnimalCodeSequences => Set<AnimalCodeSequence>();

	public DbSet<Lactation> Lactations => Set<Lactation>();

	public DbSet<MilkRecord> MilkRecords => Set<MilkRecord>();

	public DbSet<MilkBuyer> MilkBuyers => Set<MilkBuyer>();

	public DbSet<MilkSale> MilkSales => Set<MilkSale>();

	public DbSet<BreedingEvent> BreedingEvents => Set<BreedingEvent>();

	public DbSet<Pregnancy> Pregnancies => Set<Pregnancy>();

	public DbSet<Calving> Calvings => Set<Calving>();

	public DbSet<Calf> Calves => Set<Calf>();

	public DbSet<Disease> Diseases => Set<Disease>();

	public DbSet<Medicine> Medicines => Set<Medicine>();

	public DbSet<HealthRecord> HealthRecords => Set<HealthRecord>();

	public DbSet<Treatment> Treatments => Set<Treatment>();

	public DbSet<VaccinationRecord> VaccinationRecords => Set<VaccinationRecord>();

	public DbSet<Supplier> Suppliers => Set<Supplier>();

	public DbSet<FeedItem> FeedItems => Set<FeedItem>();

	public DbSet<FeedTransaction> FeedTransactions => Set<FeedTransaction>();

	public DbSet<RationPlan> RationPlans => Set<RationPlan>();

	public DbSet<RationPlanItem> RationPlanItems => Set<RationPlanItem>();

	public DbSet<FeedConsumption> FeedConsumptions => Set<FeedConsumption>();

	public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();

	public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();

	public DbSet<AnimalPurchase> AnimalPurchases => Set<AnimalPurchase>();

	public DbSet<AnimalSale> AnimalSales => Set<AnimalSale>();

	public DbSet<AnimalMortality> AnimalMortalities => Set<AnimalMortality>();

	public DbSet<FinanceCategory> FinanceCategories => Set<FinanceCategory>();

	public DbSet<FinanceTransaction> FinanceTransactions => Set<FinanceTransaction>();

	public DbSet<TaskItem> Tasks => Set<TaskItem>();

	public DbSet<Alert> Alerts => Set<Alert>();

	public DbSet<Notification> Notifications => Set<Notification>();

	public DbSet<Attachment> Attachments => Set<Attachment>();

	public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

	public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

	public DbSet<FarmSetting> FarmSettings => Set<FarmSetting>();

	public AppDbContext(DbContextOptions<AppDbContext> options)
		: base(options)
	{
	}

	protected override void OnModelCreating(ModelBuilder b)
	{
		base.OnModelCreating(b);
		b.Entity((EntityTypeBuilder<Company> e) =>
		{
			e.HasKey((Company x) => x.CompanyId);
			e.Property((Company x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasMany((Company x) => x.Farms).WithOne((Farm f) => f.Company).HasForeignKey((Farm x) => x.CompanyId)
				.OnDelete(DeleteBehavior.Restrict);
		});
		b.Entity((EntityTypeBuilder<Farm> e) =>
		{
			e.HasKey((Farm x) => x.FarmId);
			e.Property((Farm x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasIndex((Farm x) => x.Code).IsUnique().HasDatabaseName("uq_farms_code");
			e.HasOne((Farm x) => x.Settings).WithOne((FarmSetting s) => s.Farm).HasForeignKey((FarmSetting x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<Shed> e) =>
		{
			e.HasKey((Shed x) => x.ShedId);
			e.Property((Shed x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasIndex((Shed x) => new { x.FarmId, x.Name }).IsUnique().HasDatabaseName("uq_sheds_farm_name");
			e.HasOne((Shed x) => x.Farm).WithMany((Farm f) => f.Sheds).HasForeignKey((Shed x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((Shed x) => x.Groups).WithOne((AnimalGroup g) => g.Shed).HasForeignKey((AnimalGroup x) => x.ShedId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<AnimalGroup> e) =>
		{
			e.HasKey((AnimalGroup x) => x.GroupId);
			e.Property((AnimalGroup x) => x.Status).HasDefaultValue("ACTIVE");
			e.Property((AnimalGroup x) => x.AnimalType).HasDefaultValue("COW");
			e.HasIndex((AnimalGroup x) => new { x.FarmId, x.Name }).IsUnique().HasDatabaseName("uq_groups_farm_name");
			e.HasOne((AnimalGroup x) => x.Farm).WithMany((Farm f) => f.Groups).HasForeignKey((AnimalGroup x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((AnimalGroup x) => x.Shed).WithMany((Shed s) => s.Groups).HasForeignKey((AnimalGroup x) => x.ShedId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasMany((AnimalGroup x) => x.Animals).WithOne((Animal a) => a.Group).HasForeignKey((Animal x) => x.GroupId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Breed> e) =>
		{
			e.HasKey((Breed x) => x.BreedId);
			e.Property((Breed x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasIndex((Breed x) => x.Name).IsUnique().HasDatabaseName("uq_breeds_name");
			e.HasMany((Breed x) => x.Animals).WithOne((Animal a) => a.Breed).HasForeignKey((Animal x) => x.BreedId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Role> e) =>
		{
			e.HasKey((Role x) => x.RoleId);
			e.Property((Role x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasIndex((Role x) => x.Name).IsUnique().HasDatabaseName("uq_roles_name");
			e.HasMany((Role x) => x.Permissions).WithOne((RolePermission rp) => rp.Role).HasForeignKey((RolePermission x) => x.RoleId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<Permission> e) =>
		{
			e.HasKey((Permission x) => x.PermissionId);
			e.HasIndex((Permission x) => x.Name).IsUnique().HasDatabaseName("uq_permissions_name");
			e.HasMany((Permission x) => x.Roles).WithOne((RolePermission rp) => rp.Permission).HasForeignKey((RolePermission x) => x.PermissionId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<RolePermission> e) =>
		{
			e.HasKey((RolePermission x) => new { x.RoleId, x.PermissionId });
		});
		b.Entity((EntityTypeBuilder<User> e) =>
		{
			e.HasKey((User x) => x.UserId);
			e.Property((User x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasIndex((User x) => x.Username).IsUnique().HasDatabaseName("uq_users_username");
			e.HasOne((User x) => x.Farm).WithMany().HasForeignKey((User x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((User x) => x.Role).WithMany((Role r) => r.Users).HasForeignKey((User x) => x.RoleId)
				.OnDelete(DeleteBehavior.Restrict);
			e.HasMany((User x) => x.FarmAccess).WithOne((FarmUserAccess f) => f.User).HasForeignKey((FarmUserAccess x) => x.UserId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((User x) => x.Sessions).WithOne((UserSession s) => s.User).HasForeignKey((UserSession x) => x.UserId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<FarmUserAccess> e) =>
		{
			e.HasKey((FarmUserAccess x) => new { x.UserId, x.FarmId });
			e.Property((FarmUserAccess x) => x.AccessLevel).HasDefaultValue("READ");
			e.HasOne((FarmUserAccess x) => x.Farm).WithMany().HasForeignKey((FarmUserAccess x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<UserSession> e) =>
		{
			e.HasKey((UserSession x) => x.SessionId);
			e.HasIndex((UserSession x) => x.SessionToken).IsUnique().HasDatabaseName("uq_sessions_token");
		});
		b.Entity((EntityTypeBuilder<ApiKey> e) =>
		{
			e.HasKey((ApiKey x) => x.ApiKeyId);
			e.HasIndex((ApiKey x) => x.KeyHash).IsUnique().HasDatabaseName("uq_api_keys_hash");
			e.HasOne((ApiKey x) => x.Farm).WithMany().HasForeignKey((ApiKey x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((ApiKey x) => x.User).WithMany().HasForeignKey((ApiKey x) => x.UserId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Animal> e) =>
		{
			e.HasKey((Animal x) => x.AnimalId);
			e.Property((Animal x) => x.Status).HasDefaultValue("ACTIVE");
			e.Property((Animal x) => x.Sex).HasDefaultValue("FEMALE");
			e.HasIndex((Animal x) => new { x.FarmId, x.AnimalCode }).IsUnique().HasDatabaseName("uq_animals_farm_code");
			e.HasIndex((Animal x) => x.QrToken).IsUnique().HasDatabaseName("uq_animals_qr_token");
			e.HasOne((Animal x) => x.Farm).WithMany((Farm f) => f.Animals).HasForeignKey((Animal x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Animal x) => x.Shed).WithMany().HasForeignKey((Animal x) => x.ShedId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasOne((Animal x) => x.Group).WithMany((AnimalGroup g) => g.Animals).HasForeignKey((Animal x) => x.GroupId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasOne((Animal x) => x.Breed).WithMany((Breed br) => br.Animals).HasForeignKey((Animal x) => x.BreedId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasOne((Animal x) => x.Dam).WithMany().HasForeignKey((Animal x) => x.DamId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasOne((Animal x) => x.Sire).WithMany().HasForeignKey((Animal x) => x.SireId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasMany((Animal x) => x.Photos).WithOne((AnimalPhoto p) => p.Animal).HasForeignKey((AnimalPhoto x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((Animal x) => x.StatusHistory).WithOne((AnimalStatusHistory h) => h.Animal).HasForeignKey((AnimalStatusHistory x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((Animal x) => x.Lactations).WithOne((Lactation l) => l.Animal).HasForeignKey((Lactation x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((Animal x) => x.MilkRecords).WithOne((MilkRecord m) => m.Animal).HasForeignKey((MilkRecord x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<AnimalStatusHistory> e) =>
		{
			e.HasKey((AnimalStatusHistory x) => x.StatusHistoryId);
		});
		b.Entity((EntityTypeBuilder<AnimalPhoto> e) =>
		{
			e.HasKey((AnimalPhoto x) => x.PhotoId);
			e.Property((AnimalPhoto x) => x.ImageData).HasColumnType("longblob");
			e.Property((AnimalPhoto x) => x.IsPrimary).HasColumnType("tinyint(1)");
		});
		b.Entity((EntityTypeBuilder<AnimalCodeSequence> e) =>
		{
			e.HasKey((AnimalCodeSequence x) => x.FarmId);
			e.Property((AnimalCodeSequence x) => x.Prefix).HasDefaultValue("AN-");
			e.Property((AnimalCodeSequence x) => x.NextNumber).HasDefaultValue(1uL);
			e.HasOne((AnimalCodeSequence x) => x.Farm).WithMany().HasForeignKey((AnimalCodeSequence x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<Lactation> e) =>
		{
			e.HasKey((Lactation x) => x.LactationId);
			e.Property((Lactation x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasIndex((Lactation x) => new { x.AnimalId, x.LactationNumber }).IsUnique().HasDatabaseName("uq_lactations_animal_no");
		});
		b.Entity((EntityTypeBuilder<MilkRecord> e) =>
		{
			e.HasKey((MilkRecord x) => x.MilkRecordId);
			e.Property((MilkRecord x) => x.Session).HasDefaultValue("MORNING");
			e.Property((MilkRecord x) => x.MilkLiters).HasPrecision(8, 2);
			e.Property((MilkRecord x) => x.IsRejected).HasColumnType("tinyint(1)");
			e.HasIndex((MilkRecord x) => new { x.AnimalId, x.RecordDate, x.Session }).IsUnique().HasDatabaseName("uq_milk_animal_date_session");
			e.HasOne((MilkRecord x) => x.Farm).WithMany().HasForeignKey((MilkRecord x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((MilkRecord x) => x.Lactation).WithMany((Lactation l) => l.MilkRecords).HasForeignKey((MilkRecord x) => x.LactationId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<MilkBuyer> e) =>
		{
			e.HasKey((MilkBuyer x) => x.BuyerId);
			e.Property((MilkBuyer x) => x.Status).HasDefaultValue("ACTIVE");
			e.Property((MilkBuyer x) => x.BuyerType).HasDefaultValue("LOCAL_SHOP");
			e.HasOne((MilkBuyer x) => x.Farm).WithMany().HasForeignKey((MilkBuyer x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((MilkBuyer x) => x.MilkSales).WithOne((MilkSale s) => s.Buyer).HasForeignKey((MilkSale x) => x.BuyerId)
				.OnDelete(DeleteBehavior.Restrict);
		});
		b.Entity((EntityTypeBuilder<MilkSale> e) =>
		{
			e.HasKey((MilkSale x) => x.MilkSaleId);
			e.Property((MilkSale x) => x.MilkQuantityLiters).HasPrecision(10, 2);
			e.Property((MilkSale x) => x.PricePerLiter).HasPrecision(10, 2);
			e.Property((MilkSale x) => x.TotalAmount).HasPrecision(14, 2);
			e.Property((MilkSale x) => x.AmountPaid).HasPrecision(14, 2);
			e.Property((MilkSale x) => x.AmountDue).HasPrecision(14, 2);
			e.Property((MilkSale x) => x.PaymentMethod).HasDefaultValue("CASH");
			e.Property((MilkSale x) => x.PaymentStatus).HasDefaultValue("PAID");
			e.HasOne((MilkSale x) => x.Farm).WithMany().HasForeignKey((MilkSale x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<BreedingEvent> e) =>
		{
			e.HasKey((BreedingEvent x) => x.BreedingEventId);
			e.Property((BreedingEvent x) => x.EventType).HasDefaultValue("HEAT");
			e.HasOne((BreedingEvent x) => x.Farm).WithMany().HasForeignKey((BreedingEvent x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((BreedingEvent x) => x.Animal).WithMany().HasForeignKey((BreedingEvent x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((BreedingEvent x) => x.ServiceAnimal).WithMany().HasForeignKey((BreedingEvent x) => x.ServiceAnimalId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasMany((BreedingEvent x) => x.Pregnancies).WithOne((Pregnancy p) => p.BreedingEvent).HasForeignKey((Pregnancy x) => x.BreedingEventId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Pregnancy> e) =>
		{
			e.HasKey((Pregnancy x) => x.PregnancyId);
			e.Property((Pregnancy x) => x.Status).HasDefaultValue("CONFIRMED");
			e.HasOne((Pregnancy x) => x.Farm).WithMany().HasForeignKey((Pregnancy x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Pregnancy x) => x.Animal).WithMany().HasForeignKey((Pregnancy x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((Pregnancy x) => x.Calvings).WithOne((Calving c) => c.Pregnancy).HasForeignKey((Calving x) => x.PregnancyId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Calving> e) =>
		{
			e.HasKey((Calving x) => x.CalvingId);
			e.Property((Calving x) => x.CalvingType).HasDefaultValue("NORMAL");
			e.Property((Calving x) => x.CalvingStatus).HasDefaultValue("COMPLETED");
			e.Property((Calving x) => x.CalfCount).HasDefaultValue(1);
			e.Property((Calving x) => x.ColostrumGiven).HasColumnType("tinyint(1)");
			e.HasOne((Calving x) => x.Farm).WithMany().HasForeignKey((Calving x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Calving x) => x.Animal).WithMany().HasForeignKey((Calving x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((Calving x) => x.Calves).WithOne((Calf c) => c.Calving).HasForeignKey((Calf x) => x.CalvingId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<Calf> e) =>
		{
			e.HasKey((Calf x) => x.CalfId);
			e.Property((Calf x) => x.Sex).HasDefaultValue("FEMALE");
			e.Property((Calf x) => x.Outcome).HasDefaultValue("ALIVE");
			e.Property((Calf x) => x.ColostrumReceived).HasColumnType("tinyint(1)");
			e.HasIndex((Calf x) => new { x.FarmId, x.CalfNumber }).IsUnique().HasDatabaseName("uq_calves_number");
			e.HasOne((Calf x) => x.Farm).WithMany().HasForeignKey((Calf x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Calf x) => x.CalfAnimal).WithMany().HasForeignKey((Calf x) => x.CalfAnimalId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasOne((Calf x) => x.Dam).WithMany().HasForeignKey((Calf x) => x.DamId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasOne((Calf x) => x.Sire).WithMany().HasForeignKey((Calf x) => x.SireId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Disease> e) =>
		{
			e.HasKey((Disease x) => x.DiseaseId);
			e.Property((Disease x) => x.IsActive).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.HasIndex((Disease x) => x.Name).IsUnique().HasDatabaseName("uq_diseases_name");
			e.HasMany((Disease x) => x.HealthRecords).WithOne((HealthRecord h) => h.Disease).HasForeignKey((HealthRecord x) => x.DiseaseId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Medicine> e) =>
		{
			e.HasKey((Medicine x) => x.MedicineId);
			e.Property((Medicine x) => x.IsActive).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.Property((Medicine x) => x.WithdrawalMilkHours).HasDefaultValue(0);
			e.Property((Medicine x) => x.WithdrawalMeatDays).HasDefaultValue(0);
			e.HasIndex((Medicine x) => x.Name).IsUnique().HasDatabaseName("uq_medicines_name");
			e.HasMany((Medicine x) => x.Treatments).WithOne((Treatment t) => t.Medicine).HasForeignKey((Treatment x) => x.MedicineId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<HealthRecord> e) =>
		{
			e.HasKey((HealthRecord x) => x.HealthRecordId);
			e.Property((HealthRecord x) => x.RecordType).HasDefaultValue("ILLNESS");
			e.Property((HealthRecord x) => x.Status).HasDefaultValue("OPEN");
			e.Property((HealthRecord x) => x.IsWithdrawal).HasColumnType("tinyint(1)");
			e.HasOne((HealthRecord x) => x.Farm).WithMany().HasForeignKey((HealthRecord x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((HealthRecord x) => x.Animal).WithMany().HasForeignKey((HealthRecord x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((HealthRecord x) => x.Treatments).WithOne((Treatment t) => t.HealthRecord).HasForeignKey((Treatment x) => x.HealthRecordId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Treatment> e) =>
		{
			e.HasKey((Treatment x) => x.TreatmentId);
			e.Property((Treatment x) => x.TreatmentStatus).HasDefaultValue("ONGOING");
			e.HasOne((Treatment x) => x.Farm).WithMany().HasForeignKey((Treatment x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Treatment x) => x.Animal).WithMany().HasForeignKey((Treatment x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Treatment x) => x.Disease).WithMany().HasForeignKey((Treatment x) => x.DiseaseId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<VaccinationRecord> e) =>
		{
			e.HasKey((VaccinationRecord x) => x.VaccinationId);
			e.Property((VaccinationRecord x) => x.Status).HasDefaultValue("COMPLETED");
			e.HasOne((VaccinationRecord x) => x.Farm).WithMany().HasForeignKey((VaccinationRecord x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((VaccinationRecord x) => x.Animal).WithMany().HasForeignKey((VaccinationRecord x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((VaccinationRecord x) => x.Group).WithMany().HasForeignKey((VaccinationRecord x) => x.GroupId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Supplier> e) =>
		{
			e.HasKey((Supplier x) => x.SupplierId);
			e.Property((Supplier x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasOne((Supplier x) => x.Farm).WithMany().HasForeignKey((Supplier x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((Supplier x) => x.FeedTransactions).WithOne((FeedTransaction t) => t.Supplier).HasForeignKey((FeedTransaction x) => x.SupplierId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasMany((Supplier x) => x.InventoryTransactions).WithOne((InventoryTransaction t) => t.Supplier).HasForeignKey((InventoryTransaction x) => x.SupplierId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<FeedItem> e) =>
		{
			e.HasKey((FeedItem x) => x.FeedItemId);
			e.Property((FeedItem x) => x.Status).HasDefaultValue("ACTIVE");
			e.Property((FeedItem x) => x.Unit).HasDefaultValue("KG");
			e.HasIndex((FeedItem x) => new { x.FarmId, x.Name }).IsUnique().HasDatabaseName("uq_feed_items_farm_name");
			e.HasOne((FeedItem x) => x.Farm).WithMany().HasForeignKey((FeedItem x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((FeedItem x) => x.Transactions).WithOne((FeedTransaction t) => t.FeedItem).HasForeignKey((FeedTransaction x) => x.FeedItemId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((FeedItem x) => x.Consumptions).WithOne((FeedConsumption t) => t.FeedItem).HasForeignKey((FeedConsumption x) => x.FeedItemId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((FeedItem x) => x.RationPlanItems).WithOne((RationPlanItem t) => t.FeedItem).HasForeignKey((RationPlanItem x) => x.FeedItemId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<FeedTransaction> e) =>
		{
			e.HasKey((FeedTransaction x) => x.FeedTransactionId);
			e.Property((FeedTransaction x) => x.TransactionType).HasDefaultValue("PURCHASE");
			e.Property((FeedTransaction x) => x.Quantity).HasPrecision(12, 3);
			e.Property((FeedTransaction x) => x.UnitCost).HasPrecision(12, 2);
			e.Property((FeedTransaction x) => x.TotalCost).HasPrecision(14, 2);
			e.HasOne((FeedTransaction x) => x.Farm).WithMany().HasForeignKey((FeedTransaction x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<RationPlan> e) =>
		{
			e.HasKey((RationPlan x) => x.RationPlanId);
			e.Property((RationPlan x) => x.Status).HasDefaultValue("ACTIVE");
			e.HasIndex((RationPlan x) => new { x.FarmId, x.Name }).IsUnique().HasDatabaseName("uq_ration_farm_name");
			e.HasOne((RationPlan x) => x.Farm).WithMany().HasForeignKey((RationPlan x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((RationPlan x) => x.Animal).WithMany().HasForeignKey((RationPlan x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((RationPlan x) => x.Group).WithMany().HasForeignKey((RationPlan x) => x.GroupId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((RationPlan x) => x.Items).WithOne((RationPlanItem i) => i.RationPlan).HasForeignKey((RationPlanItem x) => x.RationPlanId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((RationPlan x) => x.Consumptions).WithOne((FeedConsumption c) => c.RationPlan).HasForeignKey((FeedConsumption x) => x.RationPlanId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<RationPlanItem> e) =>
		{
			e.HasKey((RationPlanItem x) => x.RationPlanItemId);
			e.Property((RationPlanItem x) => x.QuantityPerDay).HasPrecision(12, 3);
			e.HasIndex((RationPlanItem x) => new { x.RationPlanId, x.FeedItemId }).IsUnique().HasDatabaseName("uq_ration_item");
		});
		b.Entity((EntityTypeBuilder<FeedConsumption> e) =>
		{
			e.HasKey((FeedConsumption x) => x.FeedConsumptionId);
			e.Property((FeedConsumption x) => x.Quantity).HasPrecision(12, 3);
			e.HasOne((FeedConsumption x) => x.Farm).WithMany().HasForeignKey((FeedConsumption x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((FeedConsumption x) => x.Animal).WithMany().HasForeignKey((FeedConsumption x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((FeedConsumption x) => x.Group).WithMany().HasForeignKey((FeedConsumption x) => x.GroupId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<InventoryItem> e) =>
		{
			e.HasKey((InventoryItem x) => x.InventoryItemId);
			e.Property((InventoryItem x) => x.Status).HasDefaultValue("ACTIVE");
			e.Property((InventoryItem x) => x.Unit).HasDefaultValue("PCS");
			e.HasIndex((InventoryItem x) => new { x.FarmId, x.Name }).IsUnique().HasDatabaseName("uq_inventory_farm_name");
			e.HasOne((InventoryItem x) => x.Farm).WithMany().HasForeignKey((InventoryItem x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((InventoryItem x) => x.Transactions).WithOne((InventoryTransaction t) => t.InventoryItem).HasForeignKey((InventoryTransaction x) => x.InventoryItemId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<InventoryTransaction> e) =>
		{
			e.HasKey((InventoryTransaction x) => x.InventoryTransactionId);
			e.Property((InventoryTransaction x) => x.TransactionType).HasDefaultValue("PURCHASE");
			e.Property((InventoryTransaction x) => x.Quantity).HasPrecision(12, 3);
			e.Property((InventoryTransaction x) => x.UnitCost).HasPrecision(12, 2);
			e.Property((InventoryTransaction x) => x.TotalCost).HasPrecision(14, 2);
			e.HasOne((InventoryTransaction x) => x.Farm).WithMany().HasForeignKey((InventoryTransaction x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<AnimalPurchase> e) =>
		{
			e.HasKey((AnimalPurchase x) => x.PurchaseId);
			e.Property((AnimalPurchase x) => x.PurchasePrice).HasPrecision(14, 2);
			e.Property((AnimalPurchase x) => x.TransportCost).HasPrecision(14, 2).HasDefaultValue(0m);
			e.Property((AnimalPurchase x) => x.VeterinaryCost).HasPrecision(14, 2).HasDefaultValue(0m);
			e.Property((AnimalPurchase x) => x.LandedCost).HasPrecision(14, 2);
			e.HasOne((AnimalPurchase x) => x.Farm).WithMany().HasForeignKey((AnimalPurchase x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((AnimalPurchase x) => x.Animal).WithMany().HasForeignKey((AnimalPurchase x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((AnimalPurchase x) => x.Supplier).WithMany().HasForeignKey((AnimalPurchase x) => x.SupplierId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<AnimalSale> e) =>
		{
			e.HasKey((AnimalSale x) => x.SaleId);
			e.Property((AnimalSale x) => x.SalePrice).HasPrecision(14, 2);
			e.Property((AnimalSale x) => x.WeightKg).HasPrecision(8, 2);
			e.Property((AnimalSale x) => x.CostBasis).HasPrecision(14, 2);
			e.Property((AnimalSale x) => x.ProfitLoss).HasPrecision(14, 2);
			e.HasOne((AnimalSale x) => x.Farm).WithMany().HasForeignKey((AnimalSale x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((AnimalSale x) => x.Animal).WithMany().HasForeignKey((AnimalSale x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((AnimalSale x) => x.Buyer).WithMany().HasForeignKey((AnimalSale x) => x.BuyerId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<AnimalMortality> e) =>
		{
			e.HasKey((AnimalMortality x) => x.MortalityId);
			e.Property((AnimalMortality x) => x.PostMortemDone).HasColumnType("tinyint(1)");
			e.HasOne((AnimalMortality x) => x.Farm).WithMany().HasForeignKey((AnimalMortality x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((AnimalMortality x) => x.Animal).WithMany().HasForeignKey((AnimalMortality x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Restrict);
		});
		b.Entity((EntityTypeBuilder<FinanceCategory> e) =>
		{
			e.HasKey((FinanceCategory x) => x.CategoryId);
			e.Property((FinanceCategory x) => x.Status).HasDefaultValue("ACTIVE");
			e.Property((FinanceCategory x) => x.CategoryType).HasDefaultValue("EXPENSE");
			e.HasIndex((FinanceCategory x) => new { x.FarmId, x.Name }).IsUnique().HasDatabaseName("uq_fin_cat_farm_name");
			e.HasOne((FinanceCategory x) => x.Farm).WithMany().HasForeignKey((FinanceCategory x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((FinanceCategory x) => x.Transactions).WithOne((FinanceTransaction t) => t.Category).HasForeignKey((FinanceTransaction x) => x.CategoryId)
				.OnDelete(DeleteBehavior.Restrict);
		});
		b.Entity((EntityTypeBuilder<FinanceTransaction> e) =>
		{
			e.HasKey((FinanceTransaction x) => x.FinanceTransactionId);
			e.Property((FinanceTransaction x) => x.TransactionType).HasDefaultValue("EXPENSE");
			e.Property((FinanceTransaction x) => x.Amount).HasPrecision(14, 2);
			e.HasOne((FinanceTransaction x) => x.Farm).WithMany().HasForeignKey((FinanceTransaction x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((FinanceTransaction x) => x.Supplier).WithMany().HasForeignKey((FinanceTransaction x) => x.SupplierId)
				.OnDelete(DeleteBehavior.SetNull);
			e.HasOne((FinanceTransaction x) => x.Buyer).WithMany().HasForeignKey((FinanceTransaction x) => x.BuyerId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<TaskItem> e) =>
		{
			e.HasKey((TaskItem x) => x.TaskId);
			e.Property((TaskItem x) => x.TaskType).HasDefaultValue("OTHER");
			e.Property((TaskItem x) => x.Priority).HasDefaultValue("MEDIUM");
			e.Property((TaskItem x) => x.Status).HasDefaultValue("PENDING");
			e.Property((TaskItem x) => x.DueTime).HasColumnType("time");
			e.HasOne((TaskItem x) => x.Farm).WithMany().HasForeignKey((TaskItem x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((TaskItem x) => x.Animal).WithMany().HasForeignKey((TaskItem x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((TaskItem x) => x.Group).WithMany().HasForeignKey((TaskItem x) => x.GroupId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((TaskItem x) => x.AssignedUser).WithMany().HasForeignKey((TaskItem x) => x.AssignedTo)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<Alert> e) =>
		{
			e.HasKey((Alert x) => x.AlertId);
			e.Property((Alert x) => x.AlertType).HasDefaultValue("OTHER");
			e.Property((Alert x) => x.Severity).HasDefaultValue("INFO");
			e.Property((Alert x) => x.IsRead).HasColumnType("tinyint(1)");
			e.Property((Alert x) => x.IsResolved).HasColumnType("tinyint(1)");
			e.HasOne((Alert x) => x.Farm).WithMany().HasForeignKey((Alert x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Alert x) => x.Animal).WithMany().HasForeignKey((Alert x) => x.AnimalId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasMany((Alert x) => x.Notifications).WithOne((Notification n) => n.Alert).HasForeignKey((Notification x) => x.AlertId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<Notification> e) =>
		{
			e.HasKey((Notification x) => x.NotificationId);
			e.Property((Notification x) => x.IsRead).HasColumnType("tinyint(1)");
			e.Property((Notification x) => x.IsDone).HasColumnType("tinyint(1)");
			e.HasOne((Notification x) => x.Farm).WithMany().HasForeignKey((Notification x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Notification x) => x.User).WithMany().HasForeignKey((Notification x) => x.UserId)
				.OnDelete(DeleteBehavior.Cascade);
		});
		b.Entity((EntityTypeBuilder<Attachment> e) =>
		{
			e.HasKey((Attachment x) => x.AttachmentId);
			e.HasOne((Attachment x) => x.Farm).WithMany().HasForeignKey((Attachment x) => x.FarmId)
				.OnDelete(DeleteBehavior.Cascade);
			e.HasOne((Attachment x) => x.UploadedByUser).WithMany().HasForeignKey((Attachment x) => x.UploadedBy)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<AuditLog> e) =>
		{
			e.HasKey((AuditLog x) => x.AuditLogId);
			e.Property((AuditLog x) => x.OldValues).HasColumnType("longtext");
			e.Property((AuditLog x) => x.NewValues).HasColumnType("longtext");
			e.HasOne((AuditLog x) => x.User).WithMany().HasForeignKey((AuditLog x) => x.UserId)
				.OnDelete(DeleteBehavior.SetNull);
		});
		b.Entity((EntityTypeBuilder<SystemSetting> e) =>
		{
			e.HasKey((SystemSetting x) => x.SystemSettingId);
			e.Property((SystemSetting x) => x.SettingValue).HasColumnType("text");
			e.Property((SystemSetting x) => x.DataType).HasDefaultValue("string");
			e.HasIndex((SystemSetting x) => x.SettingKey).IsUnique().HasDatabaseName("uq_system_settings_key");
		});
		b.Entity((EntityTypeBuilder<FarmSetting> e) =>
		{
			e.HasKey((FarmSetting x) => x.FarmSettingId);
			e.Property((FarmSetting x) => x.Currency).HasDefaultValue("PKR");
			e.Property((FarmSetting x) => x.Timezone).HasDefaultValue("Asia/Karachi");
			e.Property((FarmSetting x) => x.MilkUnit).HasDefaultValue("LITER");
			e.Property((FarmSetting x) => x.DateFormat).HasDefaultValue("yyyy-MM-dd");
			e.Property((FarmSetting x) => x.MilkDropThresholdPercent).HasPrecision(5, 2).HasDefaultValue(20.00m);
			e.Property((FarmSetting x) => x.LowStockAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.Property((FarmSetting x) => x.VaccinationAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.Property((FarmSetting x) => x.HealthFollowUpAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.Property((FarmSetting x) => x.PregnancyAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.Property((FarmSetting x) => x.TaskAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.Property((FarmSetting x) => x.MilkDropAlertEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.Property((FarmSetting x) => x.AuditLoggingEnabled).HasColumnType("tinyint(1)").HasDefaultValue(true);
			e.HasIndex((FarmSetting x) => x.FarmId).IsUnique().HasDatabaseName("uq_farm_settings_farm");
		});
	}
}
