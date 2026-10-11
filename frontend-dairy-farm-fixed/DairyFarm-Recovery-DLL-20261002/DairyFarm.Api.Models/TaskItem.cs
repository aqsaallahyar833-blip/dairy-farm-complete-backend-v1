using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("tasks")]
public class TaskItem
{
	[Key]
	[Column("task_id")]
	public ulong TaskId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("animal_id")]
	public ulong? AnimalId { get; set; }

	[Column("group_id")]
	public ulong? GroupId { get; set; }

	[Column("assigned_to")]
	public ulong? AssignedTo { get; set; }

	[Column("title")]
	[StringLength(200)]
	public string Title { get; set; } = string.Empty;

	[Column("description")]
	public string? Description { get; set; }

	[Column("task_type")]
	[StringLength(30)]
	public string TaskType { get; set; } = "OTHER";

	[Column("priority")]
	[StringLength(10)]
	public string Priority { get; set; } = "MEDIUM";

	[Column("due_date")]
	public DateTime DueDate { get; set; }

	[Column("due_time")]
	public TimeSpan? DueTime { get; set; }

	[Column("status")]
	[StringLength(20)]
	public string Status { get; set; } = "PENDING";

	[Column("completed_at")]
	public DateTime? CompletedAt { get; set; }

	[Column("notes")]
	public string? Notes { get; set; }

	[Column("created_by")]
	public ulong? CreatedBy { get; set; }

	[Column("created_at")]
	public DateTime CreatedAt { get; set; }

	[Column("updated_at")]
	public DateTime UpdatedAt { get; set; }

	public Farm? Farm { get; set; }

	public Animal? Animal { get; set; }

	public AnimalGroup? Group { get; set; }

	public User? AssignedUser { get; set; }
}
