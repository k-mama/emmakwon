from __future__ import annotations

import ctypes
import os
from ctypes import wintypes

_JOB_OBJECT_EXTENDED_LIMIT_INFORMATION = 9
_JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000
_JOB_HANDLES: set[int] = set()


class _JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", ctypes.c_longlong),
        ("PerJobUserTimeLimit", ctypes.c_longlong),
        ("LimitFlags", wintypes.DWORD),
        ("MinimumWorkingSetSize", ctypes.c_size_t),
        ("MaximumWorkingSetSize", ctypes.c_size_t),
        ("ActiveProcessLimit", wintypes.DWORD),
        ("Affinity", ctypes.c_size_t),
        ("PriorityClass", wintypes.DWORD),
        ("SchedulingClass", wintypes.DWORD),
    ]


class _IO_COUNTERS(ctypes.Structure):
    _fields_ = [
        ("ReadOperationCount", ctypes.c_ulonglong),
        ("WriteOperationCount", ctypes.c_ulonglong),
        ("OtherOperationCount", ctypes.c_ulonglong),
        ("ReadTransferCount", ctypes.c_ulonglong),
        ("WriteTransferCount", ctypes.c_ulonglong),
        ("OtherTransferCount", ctypes.c_ulonglong),
    ]


class _JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", _JOBOBJECT_BASIC_LIMIT_INFORMATION),
        ("IoInfo", _IO_COUNTERS),
        ("ProcessMemoryLimit", ctypes.c_size_t),
        ("JobMemoryLimit", ctypes.c_size_t),
        ("PeakProcessMemoryUsed", ctypes.c_size_t),
        ("PeakJobMemoryUsed", ctypes.c_size_t),
    ]


def bind_child_to_parent_lifetime(process_handle: int) -> int | None:
    """Bind one child process to the current Windows process lifetime.

    The worker is placed in a Job Object configured with
    ``JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE``. Windows therefore terminates the
    transcription worker automatically if the UI process disappears because of
    a crash, forced termination, logoff, or other abnormal exit. This prevents
    an orphan worker from continuing to write the queue/transcript database and
    from blocking the next application launch.

    Returns an opaque Job Object handle that must be kept alive while the child
    is running and released after the child exits. Non-Windows platforms return
    ``None``.
    """
    if os.name != "nt":
        return None

    kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
    kernel32.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
    kernel32.CreateJobObjectW.restype = wintypes.HANDLE
    kernel32.SetInformationJobObject.argtypes = [
        wintypes.HANDLE,
        ctypes.c_int,
        ctypes.c_void_p,
        wintypes.DWORD,
    ]
    kernel32.SetInformationJobObject.restype = wintypes.BOOL
    kernel32.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    kernel32.AssignProcessToJobObject.restype = wintypes.BOOL
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL
    kernel32.GetLastError.argtypes = []
    kernel32.GetLastError.restype = wintypes.DWORD

    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        raise ctypes.WinError(int(kernel32.GetLastError()))

    info = _JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
    info.BasicLimitInformation.LimitFlags = _JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if not kernel32.SetInformationJobObject(
        job,
        _JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
        ctypes.byref(info),
        ctypes.sizeof(info),
    ):
        error = int(kernel32.GetLastError())
        kernel32.CloseHandle(job)
        raise ctypes.WinError(error)

    if not kernel32.AssignProcessToJobObject(job, wintypes.HANDLE(int(process_handle))):
        error = int(kernel32.GetLastError())
        kernel32.CloseHandle(job)
        raise ctypes.WinError(error)

    handle = int(job)
    _JOB_HANDLES.add(handle)
    return handle


def release_parent_lifetime_job(handle: int | None) -> None:
    """Release a Job Object handle after its child has finished."""
    if handle is None or os.name != "nt":
        return
    if handle not in _JOB_HANDLES:
        return
    try:
        ctypes.windll.kernel32.CloseHandle(wintypes.HANDLE(handle))  # type: ignore[attr-defined]
    finally:
        _JOB_HANDLES.discard(handle)


__all__ = ["bind_child_to_parent_lifetime", "release_parent_lifetime_job"]
