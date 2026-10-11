using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("attachments")]
public class Attachment
{
	[Key]
	[Column("attachment_id")]
	public ulong AttachmentId { get; set; }

	[Column("farm_id")]
	public ulong FarmId { get; set; }

	[Column("entity_type")]
	[StringLength(100)]
	public string EntityType { get; set; } = string.Empty;

	[Column("entity_id")]
	public ulong EntityId { get; set; }

	[Column("file_name")]
	[StringLength(255)]
	public string FileName { get; set; } = string.Empty;

	[Column("content_type")]
	[StringLength(100)]
	public string ContentType { get; set; } = string.Empty;

	[Column("file_size")]
	public ulong FileSize { get; set; }

	[Column("storage_path")]
	[StringLength(500)]
	public string StoragePath { get; set; } = string.Empty;

	[Column("uploaded_by")]
	public ulong? UploadedBy { get; set; }

	[Column("uploaded_at")]
	public DateTime UploadedAt { get; set; }

	public Farm? Farm { get; set; }

	public User? UploadedByUser { get; set; }
}
