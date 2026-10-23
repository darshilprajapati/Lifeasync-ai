using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Finance
{
    public class CreateUserBudgetDto
    {
        [Required(ErrorMessage = "Category is required.")]
        [StringLength(100, ErrorMessage = "Category name must not exceed 100 characters.")]
        public string Category { get; set; } = string.Empty;

        [Range(1, 100000000, ErrorMessage = "Monthly budget limit must be a positive amount.")]
        public decimal MonthlyLimit { get; set; }
    }
}
