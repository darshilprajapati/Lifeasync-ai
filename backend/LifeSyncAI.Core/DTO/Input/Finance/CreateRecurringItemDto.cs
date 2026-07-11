using System;
using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Finance
{
    public class CreateRecurringItemDto
    {
        [Required(ErrorMessage = "Description is required.")]
        [StringLength(250, ErrorMessage = "Description cannot exceed 250 characters.")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Amount is required.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
        public decimal Amount { get; set; }

        [Required(ErrorMessage = "Type is required.")]
        [RegularExpression("^(Loan|EMI|Bill)$", ErrorMessage = "Type must be either 'Loan', 'EMI', or 'Bill'.")]
        public string Type { get; set; } = string.Empty;

        [Required(ErrorMessage = "Frequency is required.")]
        [RegularExpression("^(Monthly|Yearly)$", ErrorMessage = "Frequency must be either 'Monthly' or 'Yearly'.")]
        public string Frequency { get; set; } = string.Empty;

        [Required(ErrorMessage = "Due Date is required.")]
        public DateTime DueDate { get; set; }
    }
}
