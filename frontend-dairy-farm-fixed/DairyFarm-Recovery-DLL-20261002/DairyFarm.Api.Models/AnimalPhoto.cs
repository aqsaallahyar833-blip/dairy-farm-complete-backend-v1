using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DairyFarm.Api.Models;

[Table("animal_photos")]
public class AnimalPhoto
{
	[Key]
	[Column("photo_id")]
	public ulong PhotoId { get; set; }

	[Column("animal_id")]
	public ulong AnimalId { get; set; }

	[Column("file_name")]
	[StringLength(255)]
	public string FileName { get; set; } = string.Empty;

	[Column("content_type")]
	[StringLength(100)]
	public string ContentType { get; set; } = string.Empty;

	[Column("file_size")]
	public ulong FileSize { get; set; }

	[Column("image_data")]
	public byte[] ImageData { get; set; } = Array.Empty<byte>();

	[Column("is_primary")]
	public bool IsPrimary { get; set; }

	[Column("uploaded_by")]
	public ulong? UploadedBy { get; set; }

	[Column("uploaded_at")]
	public DateTime UploadedAt { get; set; }

	public Animal? Animal { get; set; }
}
