# app/core/device_mapping.py

DEVICE_DRIVERS = {
    "MikroTik": "mikrotik_routeros",
    "Cisco": "cisco_ios",
    "TP-Link Omada": "tp_link_jetstream",
    "Ruijie": "ruijie_os",
    "HP / Aruba": "hp_procurve",
    "Huawei": "huawei",
    "Juniper": "juniper_junos",
    "Fortinet": "fortinet"
}

def get_netmiko_driver(vendor: str) -> str:
    """Mengambil driver Netmiko berdasarkan vendor."""
    return DEVICE_DRIVERS.get(vendor, "autodetect")
