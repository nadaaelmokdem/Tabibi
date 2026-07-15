using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Core.Models
{
   
        public class ChatMessage
        {
            [Key]
            public long MessageId { get; set; }

            public long SessionId { get; set; }

            [Required, MaxLength(10)]
            public string Role { get; set; } = "";  
            [Required]
            public string Content { get; set; } = "";

            public DateTime SentAt { get; set; } = DateTime.UtcNow;

            // Navigation
            [ForeignKey(nameof(SessionId))]
            public ChatSession Session { get; set; } = null!;
        }
    }


