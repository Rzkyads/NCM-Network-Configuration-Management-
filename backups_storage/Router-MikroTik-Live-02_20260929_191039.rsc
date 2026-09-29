# 2026-09-29 19:11:28 by RouterOS 7.23.7
# software id = CX57-828L
#
/interface ethernet
set [ find default-name=ether1 ] disable-running-check=no
/user group
add name=web-api policy=read,write,test,sensitive,api,!local,!telnet,!ssh,!ftp,!reboot,!policy,!winbox,!password,!web,!sniff,!romon,!rest-api
/ip address
add address=172.17.4.164/24 interface=ether1 network=172.17.4.0
/ip dhcp-client
add default-route-tables=main disabled=yes interface=ether1 name=client1
/ip route
add disabled=no dst-address=0.0.0.0/0 gateway=172.17.4.1 routing-table=main
/ip service
set ftp disabled=yes
set api-ssl port=8730
/system clock
set time-zone-name=Asia/Jakarta
/system identity
set name=ROUTER-05