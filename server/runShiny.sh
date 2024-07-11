#!/bin/bash
R -e "options(shiny.launch.browser=FALSE);options(shiny.host='10.2.9.26');options(shiny.port=10011);shiny::runApp('/home/agray/projects/Dfam-umbrella/Dfam-API/server/API_Reporter.R')"