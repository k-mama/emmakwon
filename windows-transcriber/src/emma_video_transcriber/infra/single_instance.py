from __future__ import annotations

import ctypes
import os
from ctypes import wintypes

_MUTEX_NAME = r"Local\EmmaKwon.EmmaVideoTranscriber.SingleInstance.v1"
_ERROR_ALREADY_EXISTS = 183
_TH32CS_SNAPPROCESS = 0x00000002
_MAX_PATH = 260
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
    """Return other live processes with the same executable name on Windows.

    This intentionally detects older pre-lock builds too. They share the same
    durable queue/output directories and must never run concurrently with a new
    build.
    """
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


def acquire_single_instance() -> tuple[bool, list[int]]:
    """Acquire an OS-owned mutex and reject any older same-name process.

    The named mutex prevents two current builds. Process enumeration additionally
    catches old builds that predate the mutex. The OS releases the mutex handle on
    process death, so a crash cannot permanently lock the app out.
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
        # Fail closed: if Windows cannot establish exclusivity, do not risk two
        # writers touching the same SQLite queue and transcript files.
        return False, []
    if int(kernel32.GetLastError()) == _ERROR_ALREADY_EXISTS:
        kernel32.CloseHandle(handle)
        return False, other_instance_pids()

    others = other_instance_pids()
    if others:
        kernel32.CloseHandle(handle)
        return False, others

    _MUTEX_HANDLES.append(int(handle))
    return True, []


__all__ = ["acquire_single_instance", "other_instance_pids"]
