#!/bin/bash
until mysql -h mariadb -ublocktetris -pblocktetris -e'select 1'; do echo "still waiting for mariadb"; sleep 1; done
exec npm start