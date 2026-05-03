import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// Mock the entire api module so no real HTTP calls are made
jest.mock("../../src/lib/api", () => ({
  login: jest.fn(),
  signup: jest.fn(),
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  getDoctors: jest.fn(),
  getMyAppointments: jest.fn(),
  getPastAppointments: jest.fn(),
  getDoctorSlots: jest.fn(),
  createAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
}));

// Mock AuthContext so components don't depend on a real auth flow
jest.mock("../../src/context/AuthContext", () => ({
  useAuth: jest.fn(),
  AuthContext: React.createContext(null),
}));

// Mock UINotifications context
jest.mock("../../src/context/UINotifications.jsx", () => ({
  useUINotifications: () => ({
    items: [],
    toasts: [],
    addNotification: jest.fn(),
    markAllRead: jest.fn(),
    removeNotification: jest.fn(),
  }),
  UINotificationsProvider: ({ children }) => children,
}));

import * as api from "../../src/lib/api";
import { useAuth } from "../../src/context/AuthContext";


// TEST 1 – Login Form

import Login from "../../src/pages/Login";

describe("Login Form", () => {
  beforeEach(() => {
    // Default auth context: patient role selected, no user yet
    useAuth.mockReturnValue({
      login: jest.fn(),
      selectedRole: "patient",
      user: null,
    });
  });

  afterEach(() => jest.clearAllMocks());

  test("renders email, password fields and a submit button", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  test("calls login() with correct credentials on submit", async () => {
    const mockLogin = jest.fn().mockResolvedValue({ ok: true, user: { role: "patient" } });
    useAuth.mockReturnValue({ login: mockLogin, selectedRole: "patient" });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/email/i), "alice@test.com");
    await userEvent.type(screen.getByPlaceholderText(/password/i), "secret123");
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "alice@test.com",
        password: "secret123",
      });
    });
  });

  test("shows error message when login fails", async () => {
    const mockLogin = jest
      .fn()
      .mockResolvedValue({ ok: false, error: "Invalid credentials" });
    useAuth.mockReturnValue({ login: mockLogin, selectedRole: "patient" });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/email/i), "bad@test.com");
    await userEvent.type(screen.getByPlaceholderText(/password/i), "wrongpass");
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});


// TEST 2 – Signup Form Validation
import Signup from "../../src/pages/Signup";

describe("Signup Form Validation", () => {
  afterEach(() => jest.clearAllMocks());

  test("renders patient-specific fields for patient role", () => {
    useAuth.mockReturnValue({ selectedRole: "patient", signup: jest.fn() });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    // Patient fields
    expect(screen.getByPlaceholderText(/phone number/i)).toBeInTheDocument();
    // Doctor-only fields must NOT be visible
    expect(screen.queryByPlaceholderText(/specialization/i)).not.toBeInTheDocument();
  });

  test("renders doctor-specific fields for doctor role", () => {
    useAuth.mockReturnValue({ selectedRole: "doctor", signup: jest.fn() });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/specialization/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/phone number/i)).not.toBeInTheDocument();
  });

  test("shows error when passwords do not match", async () => {
    useAuth.mockReturnValue({ selectedRole: "patient", signup: jest.fn() });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/full name/i), "Alice");
    await userEvent.type(screen.getByPlaceholderText(/email/i), "alice@test.com");
    await userEvent.type(screen.getByPlaceholderText(/^password/i), "abc123");
    await userEvent.type(screen.getByPlaceholderText(/confirm password/i), "different");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  test("calls signup() with correct payload for a patient", async () => {
    const mockSignup = jest.fn().mockResolvedValue({ ok: true });
    useAuth.mockReturnValue({ selectedRole: "patient", signup: mockSignup });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/full name/i), "Alice Smith");
    await userEvent.type(screen.getByPlaceholderText(/email/i), "alice@test.com");
    await userEvent.type(screen.getByPlaceholderText(/^password/i), "secure123");
    await userEvent.type(screen.getByPlaceholderText(/confirm password/i), "secure123");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "patient",
          email: "alice@test.com",
          password: "secure123",
        })
      );
    });
  });
});


// TEST 3 – UINotificationBell
import UINotificationBell from "../../src/components/UINotificationBell.jsx";
import { useUINotifications } from "../../src/context/UINotifications.jsx";

// Override the mock to provide specific items for this suite
const mockMarkAllRead = jest.fn();
const mockRemove = jest.fn();

jest.mock("../../src/context/UINotifications.jsx", () => ({
  useUINotifications: jest.fn(),
}));

describe("UINotificationBell", () => {
  const sampleItems = [
    { id: 1, title: "Appointment Booked", message: "See you tomorrow", unread: true },
    { id: 2, title: "Reminder", message: "10 min away", unread: false },
  ];

  beforeEach(() => {
    useUINotifications.mockReturnValue({
      items: sampleItems,
      toasts: [],
      markAllRead: mockMarkAllRead,
      removeNotification: mockRemove,
    });
  });

  afterEach(() => jest.clearAllMocks());

  test("displays unread count badge", () => {
    render(
      <MemoryRouter>
        <UINotificationBell />
      </MemoryRouter>
    );
    // 1 unread item → badge shows "1"
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("clicking bell toggles the notification panel", async () => {
    render(
      <MemoryRouter>
        <UINotificationBell />
      </MemoryRouter>
    );

    // Panel should not be visible initially
    expect(screen.queryByText("Appointment Booked")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("Appointment Booked")).toBeInTheDocument();

    // Click again to close
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await waitFor(() => {
      expect(screen.queryByText("Appointment Booked")).not.toBeInTheDocument();
    });
  });

  test("clicking 'Mark all read' calls markAllRead()", () => {
    render(
      <MemoryRouter>
        <UINotificationBell />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));

    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });

  test("clicking ✕ calls removeNotification with correct id", () => {
    render(
      <MemoryRouter>
        <UINotificationBell />
      </MemoryRouter>
    );

    // Open the panel
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    // Click the first ✕ button
    const removeButtons = screen.getAllByRole("button", { name: "✕" });
    fireEvent.click(removeButtons[0]);

    expect(mockRemove).toHaveBeenCalledWith(sampleItems[0].id);
  });
});


// TEST 4 – Patient Dashboard Statistics
import PatientDashboard from "../../src/pages/PatientDashboard";

describe("Patient Dashboard Statistics", () => {
  const mockUser = { first_name: "Alice", last_name: "Smith", role: "patient" };

  const mockAppointments = [
    { id: 1, doctor_name: "Dr. House", clinic_name: "Clinic A",
      scheduled_time: "2026-12-01T10:00:00", status: "booked", notes: "" },
    { id: 2, doctor_name: "Dr. Grey", clinic_name: "Clinic B",
      scheduled_time: "2026-12-05T14:00:00", status: "booked", notes: "" },
  ];

  const mockPastAppointments = [
    { id: 3, doctor_name: "Dr. House", clinic_name: "Clinic A",
      scheduled_time: "2026-11-01T10:00:00", status: "completed",
      notes: "", completed_at: "2026-11-01T11:00:00" },
  ];

  const mockDoctors = {
    count: 1,
    results: [
      { id: 10, first_name: "Gregory", last_name: "House",
        specialization: "Diagnostics", qualification: "MD",
        experience_years: 20, clinics: [] },
    ],
  };

  beforeEach(() => {
    useAuth.mockReturnValue({ user: mockUser, selectedRole: "patient" });
    api.getDoctors.mockResolvedValue({ ok: true, data: mockDoctors });
    api.getMyAppointments.mockResolvedValue({ ok: true, data: mockAppointments });
    api.getPastAppointments.mockResolvedValue({ ok: true, data: mockPastAppointments });
  });

  afterEach(() => jest.clearAllMocks());

  test("shows correct upcoming and completed counts", async () => {
    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    // Wait for async data load
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument(); // 2 upcoming (booked)
      expect(screen.getByText("1")).toBeInTheDocument(); // 1 completed (past)
    });

    expect(screen.getByText(/upcoming/i)).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  test("displays doctor cards returned by the API", async () => {
    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Gregory House/i)).toBeInTheDocument();
      expect(screen.getByText(/Diagnostics/i)).toBeInTheDocument();
    });
  });

  test("shows empty-state message when no appointments exist", async () => {
    api.getMyAppointments.mockResolvedValue({ ok: true, data: [] });
    api.getPastAppointments.mockResolvedValue({ ok: true, data: [] });

    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/no appointments scheduled yet/i)
      ).toBeInTheDocument();
    });
  });
});


// TEST 5 – API Utility Helper (getDoctors / getDoctorSlots)

import apiClient from "../../src/services/api";

// Spy on the underlying axios instance
jest.mock("../../src/services/api", () => {
  const actual = jest.requireActual("../../src/services/api");
  return {
    ...actual,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  };
});

// Import the real named exports (they call `apiClient` which we've mocked above)
const realApi = jest.requireActual("../../src/services/api");

describe("API Utility Helpers", () => {
  afterEach(() => jest.clearAllMocks());

  test("getDoctors() calls the correct URL without filters", async () => {
    apiClient.get.mockResolvedValue({ data: { count: 0, results: [] } });

    const result = await realApi.getDoctors();

    expect(apiClient.get).toHaveBeenCalledWith("/api/patient/doctors/");
    expect(result.ok).toBe(true);
    expect(result.data.results).toEqual([]);
  });

  test("getDoctors() appends filter params to the URL", async () => {
    apiClient.get.mockResolvedValue({ data: { count: 1, results: [{ id: 5 }] } });

    await realApi.getDoctors({ name: "house", specialization: "cardio" });

    const calledUrl = apiClient.get.mock.calls[0][0];
    expect(calledUrl).toContain("name=house");
    expect(calledUrl).toContain("specialization=cardio");
  });

  test("getDoctorSlots() sends doctor_id, clinic_id and date as query params", async () => {
    apiClient.get.mockResolvedValue({ data: { slots: ["09:00", "09:30"] } });

    const result = await realApi.getDoctorSlots(7, 3, "2026-12-01");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/patient/doctor-availability/",
      { params: { doctor_id: 7, clinic_id: 3, date: "2026-12-01" } }
    );
    expect(result.ok).toBe(true);
    expect(result.data.slots).toEqual(["09:00", "09:30"]);
  });

  test("returns { ok: false } when the server responds with 400", async () => {
    apiClient.get.mockRejectedValue({
      response: { data: { error: "Bad request" } },
      message: "Request failed with status code 400",
    });

    const result = await realApi.getDoctors();

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test("createAppointment() posts to the correct endpoint", async () => {
    apiClient.post.mockResolvedValue({
      data: { message: "Appointment booked successfully.", appointment: { id: 99 } },
    });

    const payload = {
      doctor_id: 1,
      clinic_id: 2,
      scheduled_time: "2026-12-01T09:00",
      notes: "first visit",
    };

    const result = await realApi.createAppointment(payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/patient/book-appointment/",
      payload
    );
    expect(result.ok).toBe(true);
    expect(result.data.appointment.id).toBe(99);
  });
});