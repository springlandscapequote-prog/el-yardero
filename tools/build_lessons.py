#!/usr/bin/env python3
"""Alias for sync_brain.py (same arguments)."""
import os, runpy, sys
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sync_brain.py'), run_name='__main__')
