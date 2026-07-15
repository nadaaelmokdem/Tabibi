using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tabibi.Application.DTOs;
using Tabibi.Application.Extensions;
using Tabibi.Core.Models;
using Tabibi.Application.Interfaces;
using Tabibi.Application.Shared;

namespace Tabibi.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentController(
    IAppointmentService appointmentService)
    : ControllerBase
{
    [HttpGet("available-slots")]
    public async Task<IActionResult> GetAvailableSlots(
        long doctorId,
        DateOnly date,
        ConsultationType? type = null)
    {
        var result = await appointmentService.GetAvailableSlots(
            doctorId,
            date,
            type);

        return Ok(result);
    }

    [HttpPost("book")]
    [Authorize(Roles = UserRoles.Patient)]
    public async Task<IActionResult> BookAppointment(
        [FromBody] BookAppointmentDTO dto)
    {
        var userId = User.GetId();

        if (string.IsNullOrEmpty(userId))
            return Unauthorized("User not authenticated");

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await appointmentService.BookAppointmentAsync(userId, dto);

        if (!result.IsSuccess)
        {
            if (result.ErrorMessage != null && (result.ErrorMessage.Contains("available", StringComparison.OrdinalIgnoreCase) || result.ErrorMessage.Contains("slot", StringComparison.OrdinalIgnoreCase)))
            {
                var date = DateOnly.FromDateTime(dto.ScheduledAt);
                var alternativeSlots = await appointmentService.GetAvailableSlots(dto.DoctorId, date, dto.Type);
                return BadRequest(new
                {
                    success = false,
                    error = "Slot not available",
                    message = result.ErrorMessage,
                    suggestedSlots = alternativeSlots
                });
            }
            return BadRequest(result.ErrorMessage);
        }

        return Ok(result.Data);
    }

    [HttpGet("doctor-appointments")]
    [Authorize(Roles = UserRoles.Doctor)]
    public async Task<IActionResult> GetDoctorAppointments([FromQuery] AppointmentFilterDTO filters)
    {
        var userId = User.GetId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized("User not authenticated");

        var appointments = await appointmentService.GetDoctorAppointmentsAsync(userId, filters);
        return Ok(appointments);
    }

    [HttpGet("patient-appointments")]
    [Authorize(Roles = UserRoles.Patient)]
    public async Task<IActionResult> GetPatientAppointments([FromQuery] AppointmentFilterDTO filters)
    {
        var userId = User.GetId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized("User not authenticated");

        var appointments = await appointmentService.GetPatientAppointmentsAsync(userId, filters);
        return Ok(appointments);
    }

    [HttpPatch("{appointmentId}/cancel")]
    [Authorize(Roles = UserRoles.Doctor)]
    public async Task<IActionResult> CancelAppointment(long appointmentId)
    {
        var userId = User.GetId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized("User not authenticated");

        var result = await appointmentService.CancelAppointmentAsync(userId, appointmentId);
        if (!result.IsSuccess)
            return BadRequest(result.ErrorMessage);

        return Ok(result.Data);
    }
}