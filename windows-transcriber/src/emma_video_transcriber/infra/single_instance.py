from __future__ import annotations

import ctypes
import os
from ctypes import wintypes

_MUTEX_NAME = r"Local\EmmaKwon.EmmaVideoTranscriber.SingleInstance.v1"
_ERROR_ALREADY_EXISTS = 183
_TH32CS_SNAPPROCESS = 0x00000002
_MAX_PATH = 260
_PROCESS_TERMINATE = 0x0001
_SYNCHRONIZE = 0x00100000
_WAIT_TIMEOUT_MS = 3000
_MUTEX_HANDLES: list[int] = []


class _PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD),
        ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD),
        ("th32DefaultHeapID", ctypes.c_size_t),
        ("th32ModuleID", wintypes.DWORD),
        ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD),
        ("pcPriClassBase", wintypes.LONG),
        ("dwFlags", wintypes.DWORD),
        ("szExeFile", wintypes.WCHAR * _MAX_PATH),
    ]


def other_instance_pids(executable_name: str = "EmmaVideoTranscriber.exe") -> list[int]:
    if os.name != "nt":
        return []
    kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
    kernel32.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
    kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel32.Process32FirstW.argtypes = [wintypes.HANDLE, ctypes.POINTER(_PROCESSENTRY32W)]
    kernel32.Process32FirstW.restype = wintypes.BOOL
    kernel32.Process32NextW.argtypes = [wintypes.HANDLE, ctypes.POINTER(_PROCESSENTRY32W)]
    kernel32.Process32NextW.restype = wintypes.BOOL
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL

    snapshot = kernel32.CreateToolhelp32Snapshot(_TH32CS_SNAPPROCESS, 0)
    invalid = wintypes.HANDLE(-1).value
    if not snapshot or snapshot == invalid:
        return []
    current_pid = os.getpid()
    matches: list[int] = []
    try:
        entry = _PROCESSENTRY32W()
        entry.dwSize = ctypes.sizeof(_PROCESSENTRY32W)
        ok = kernel32.Process32FirstW(snapshot, ctypes.byref(entry))
        while ok:
            pid = int(entry.th32ProcessID)
            if pid != current_pid and entry.szExeFile.lower() == executable_name.lower():
                matches.append(pid)
            ok = kernel32.Process32NextW(snapshot, ctypes.byref(entry))
    finally:
        kernel32.CloseHandle(snapshot)
    return matches


def _app_window_pid(title: str = "EMMA VIDEO TRANSCRIBER") -> int | None:
    if os.name != "nt":
        return None
    try:
        user32 = ctypes.windll.user32  # type: ignore[attr-defined]
        user32.FindWindowW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]
        user32.FindWindowW.restype = wintypes.HWND
        user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
        user32.GetWindowThreadProcessId.restype = wintypes.DWORD
        hwnd = user32.FindWindowW(None, title)
        if not hwnd:
            return None
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        return int(pid.value) or None
    except Exception:
        return None


def restore_existing_window(title: str = "EMMA VIDEO TRANSCRIBER") -> bool:
    """Restore a minimized/hidden real UI instead of showing a dead-end warning."""
    if os.name != "nt":
        return False
    try:
        user32 = ctypes.windll.user32  # type: ignore[attr-defined]
        user32.FindWindowW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]
        user32.FindWindowW.restype = wintypes.HWND
        user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
        user32.ShowWindow.restype = wintypes.BOOL
        user32.SetForegroundWindow.argtypes = [wintypes.HWND]
        user32.SetForegroundWindow.restype = wintypes.BOOL
        user32.BringWindowToTop.argtypes = [wintypes.HWND]
        user32.BringWindowToTop.restype = wintypes.BOOL

        hwnd = user32.FindWindowW(None, title)
        if not hwnd:
            return False
        user32.ShowWindow(hwnd, 9)  # SW_RESTORE
        user32.BringWindowToTop(hwnd)
        user32.SetForegroundWindow(hwnd)
        return True
    except Exception:
        return False


def _terminate_stale_background_processes(pids: list[int]) -> list[int]:
    """Terminate same-name processes only when no real app window owns them.

    This is the recovery path for the exact observed dead-end: the UI process died,
    its child worker survived, and the next launch mistook that worker for another UI.
    A real visible/minimized UI is never terminated here because its top-level window
    PID is checked before this function is called.
    """
    if os.name != "nt":
        return []
    kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.TerminateProcess.argtypes = [wintypes.HANDLE, wintypes.UINT]
    kernel32.TerminateProcess.restype = wintypes.BOOL
    kernel32.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
    kernel32.WaitForSingleObject.restype = wintypes.DWORD
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL

    terminated: list[int] = []
    for pid in pids:
        handle = kernel32.OpenProcess(_PROCESS_TERMINATE | _SYNCHRONIZE, False, int(pid))
        if not handle:
            continue
        try:
            if kernel32.TerminateProcess(handle, 0xE001):
                kernel32.WaitForSingleObject(handle, _WAIT_TIMEOUT_MS)
                terminated.append(int(pid))
        finally:
            kernel32.CloseHandle(handle)
    return terminated


def acquire_single_instance() -> tuple[bool, list[int]]:
    """Acquire UI exclusivity and recover stale headless workers safely.

    Return ``(True, recovered_pids)`` when startup is allowed. A non-empty second
    element on success means stale headless EmmaVideoTranscriber processes were
    terminated before touching the durable queue. Return ``(False, pids)`` when a
    real application instance is still active and should be restored/left alone.
    """
    if os.name != "nt":
        return True, []
    kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
    kernel32.CreateMutexW.argtypes = [ctypes.c_void_p, wintypes.BOOL, wintypes.LPCWSTR]
    kernel32.CreateMutexW.restype = wintypes.HANDLE
    kernel32.GetLastError.restype = wintypes.DWORD
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL

    handle = kernel32.CreateMutexW(None, False, _MUTEX_NAME)
    if not handle:
        return False, []

    if int(kernel32.GetLastError()) == _ERROR_ALREADY_EXISTS:
        kernel32.CloseHandle(handle)
        return False, other_instance_pids()

    others = other_instance_pids()
    recovered: list[int] = []
    if others:
        window_pid = _app_window_pid()
        if window_pid is not None and window_pid in others:
            kernel32.CloseHandle(handle)
            return False, others

        # No UI window exists and no current-build mutex existed. These are stale
        # headless/orphan processes. Terminate them before opening SQLite/output.
        recovered = _terminate_stale_background_processes(others)
        remaining = other_instance_pids()
        if remaining:
            kernel32.CloseHandle(handle)
            return False, remaining

    _MUTEX_HANDLES.append(int(handle))
    return True, recovered


__all__ = ["acquire_single_instance", "other_instance_pids", "restore_existing_window"]
