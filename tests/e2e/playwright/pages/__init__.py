"""
Page Object Models package
Import all page objects for easy access
"""

from .base_page import BasePage
from .home_page import HomePage
from .manual_entry_page import ManualEntryPage
from .receipt_list_page import ReceiptListPage

__all__ = [
    "BasePage",
    "HomePage",
    "ManualEntryPage",
    "ReceiptListPage",
]
