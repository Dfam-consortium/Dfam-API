"
/version -> getVersion
/blogposts -> readBlogPosts
/assemblies -> readAssemblies
/families -> readFamilies
/families/{id} -> readFamilyById
/families/{id}/hmm -> readFamilyHmm
/families/{id}/sequence -> readFamilySequence
/families/{id}/seed -> readFamilySeed
/families/{id}/relationships -> readFamilyRelationships
/families/{id}/assemblies -> readFamilyAssemblies
/families/{id}/annotation_stats -> readFamilyAnnotationStats
/families/{id}/assemblies/{assem_id}/model_coverage -> readFamilyAssemblyModelCoverage
/families/{id}/assemblies/{assem_id}/model_conservation -> readFamilyAssemblyModelConservation
/families/{id}/assemblies/{assem_id}/annotations -> readFamilyAssemblyAnnotations
/families/{id}/assemblies/{assem_id}/annotation_stats -> readFamilyAssemblyAnnotationStats
/families/{id}/assemblies/{assem_id}/karyotype -> readFamilyAssemblyKaryotype
/classes -> readClassification
/taxa -> readTaxa
/taxa/coverage -> readCoverage
/taxa/{id} -> readTaxaById
/annotations -> readAnnotations
/alignment -> readAlignment
/searches -> submitSearch
/searches/{id} -> readSearchResults
/searches/{id}/alignment -> readSearchResultAlignment
"

library(shiny)
library(bslib)
library(dplyr)
library(ggplot2)
library(ggExtra)
library(lubridate)
library(stringr)
library(tidyr)
library(shinycssloaders)

getLogData <- function(url) {
  df <- readr::read_csv(url)
  df <- df[!is.na(df$date), ]
  df$datetime <- as.POSIXct(paste(df$date, df$time), format = "%Y-%m-%d %H:%M:%S")
  df <- df[, !(names(df) %in% c("date", "time"))]
  return(df)
}

# api hits/errors over time
getCountsByType <- function(df, resolution) {
  temp <- switch(
    resolution,
    "Second" = {
      df %>%
        mutate(datetime = as.POSIXct(round(as.numeric(datetime)), origin =
                                       "1970-01-01"))
    },
    "Minute" = {
      df %>%
        mutate(datetime = as.POSIXct(round(as.numeric(datetime) / 60) * 60, origin =
                                       "1970-01-01"))
    },
    "Hour" = {
      df %>%
        mutate(datetime = as.POSIXct(round(as.numeric(datetime) / 3600) * 3600, origin =
                                       "1970-01-01"))
    },
    "Day" = {
      df %>%
        mutate(datetime = as.Date(datetime))
    },
    {
      stop("Invalid resolution specified. Use 'Second', 'Minute', 'Hour', or 'Day'.")
    }
  )
  temp <- temp %>%
    group_by(datetime, type) %>%
    summarise(count = n()) %>%
    ungroup() %>%
    pivot_wider(
      names_from = type,
      values_from = count,
      values_fill = list(count = 0)
    )
  return(temp)
}

getEndpointWParams <- function(vs) {
  temp <- as.data.frame(table(paste(vs$endpoint, "?", vs$params)))
  return(temp %>%
           arrange(desc(temp$Freq)))
}

getRawEndpoints <- function(vs) {
  temp <- as.data.frame(table(vs$endpoint))
  return(temp %>%
           arrange(desc(temp$Freq)))
}

getAPICalls <- function(df) {
  verboses <- df %>%
    filter(type == "verbose") %>%
    mutate(
      endpoint_group = case_when(
        grepl("/families/(DF|DR)[[:digit:]]{1,9}/hmm", endpoint) ~ "/families/{id}/hmm",
        grepl("/families/(DF|DR)[[:digit:]]{1,9}/sequence", endpoint) ~ "/families/{id}/sequence",
        grepl("/families/(DF|DR)[[:digit:]]{1,9}/seed", endpoint) ~ "/families/{id}/seed",
        grepl(
          "/families/(DF|DR)[[:digit:]]{1,9}/relationships",
          endpoint
        ) ~ "/families/{id}/relationships",
        grepl(
          "/families/(DF|DR)[[:digit:]]{1,9}/annotation_stats",
          endpoint
        ) ~ "/families/{id}/annotation_stats",
        grepl(
          "/families/(DF|DR)[[:digit:]]{1,9}/assemblies/[[:graph:]]+/model_coverage",
          endpoint
        ) ~ "/families/{id}/assemblies/{assem_id}/model_coverage",
        grepl(
          "/families/(DF|DR)[[:digit:]]{1,9}/assemblies/[[:graph:]]+/model_conservation",
          endpoint
        ) ~ "/families/{id}/assemblies/{assem_id}/model_conservation",
        grepl(
          "/families/(DF|DR)[[:digit:]]{1,9}/assemblies/[[:graph:]]+/annotations",
          endpoint
        ) ~ "/families/{id}/assemblies/{assem_id}/annotations",
        grepl(
          "/families/(DF|DR)[[:digit:]]{1,9}/assemblies/[[:graph:]]+/annotation_stats",
          endpoint
        ) ~ "/families/{id}/assemblies/{assem_id}/annotation_stats",
        grepl(
          "/families/(DF|DR)[[:digit:]]{1,9}/assemblies/[[:graph:]]+/karyotype",
          endpoint
        ) ~ "/families/{id}/assemblies/{assem_id}/karyotype",
        grepl("/families/(DF|DR)[[:digit:]]{1,9}/assemblies", endpoint) ~ "/families/{id}/assemblies",
        grepl("/families/(DF|DR)[[:digit:]]{1,9}", endpoint) ~ "/families/{id}",
        grepl("/families", endpoint) ~ "/families",
        grepl("/taxa/[[:digit:]]{1,9}", endpoint) ~ "/taxa/{id}",
        grepl("/searches/[[:graph:]]+/alignment", endpoint) ~ "/searches/{id}/alignment",
        grepl("/searches/[[:graph:]]+", endpoint) ~ "/searches/{id}",
        grepl("/searches", endpoint) ~ "/searches",
        grepl("/version", endpoint) ~ "/version",
        grepl("/blogposts", endpoint) ~ "/blogposts",
        grepl("/assemblies", endpoint) ~ "/assemblies",
        grepl("/classes", endpoint) ~ "/classes",
        grepl("/annotations", endpoint) ~ "/annotations",
        grepl("/alignment", endpoint) ~ "/alignment",
        grepl("/taxa/coverage", endpoint) ~ "/taxa/coverage",
        grepl("/taxa", endpoint) ~ "/taxa",
        TRUE ~ "Other"
      ),
      fam_id = ifelse(
        grepl(
          "/families/((DF|DR)[[:digit:]]{1,9})[[:graph:]]*",
          endpoint,
          perl = TRUE
        ),
        sub(
          "/families/((DF|DR)[[:digit:]]{1,9})[[:graph:]]*",
          "\\1",
          endpoint
        ),
        NA_character_
      ),
      assem_id = ifelse(
        grepl(
          "/families/((DF|DR)[[:digit:]]{1,9})/assemblies/([[:graph:]]+)(/)([[:graph:]]+)",
          endpoint,
          perl = TRUE
        ),
        sub(
          "/families/((DF|DR)[[:digit:]]{1,9})/assemblies/([[:graph:]]+)(/)([[:graph:]]+)",
          "\\3",
          endpoint
        ),
        NA_character_
      ),
      tax_id = ifelse(
        grepl("/taxa/([[:digit:]]{1,9})", endpoint, perl = TRUE),
        sub("/taxa/([[:digit:]]{1,9})", "\\1", endpoint),
        NA_character_
      ),
    )
  return(verboses)
}

# PLOTTERS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
plotUsageOverTime <- function(counts, start, end) {
  df_long <- pivot_longer(
    counts[counts$datetime >= start & counts$datetime <= end, ],
    cols = c("info", "error", "verbose"),
    names_to = "count_type",
    values_to = "count_value"
  )
  plot <- ggplot(df_long, aes(x = datetime, y = count_value, fill = count_type)) +
    geom_bar(stat = "identity", position = "dodge") +
    scale_fill_manual(values = c("red", "blue", "green")) +
    labs(
      x = "Date",
      y = "Count",
      fill = "Type",
      title = "API Calls Over Time"
    ) +
    theme(axis.text.x = element_text(angle = 60, hjust = 1))
  
  return(plot)
}

plotAvgResponseTime <- function(apiCalls, selector) {
  all_endpoints <- data.frame(endpoint = unique(endpoints)) %>% filter(endpoint %in% selector)
  data <- apiCalls[, c("endpoint_group", "res_time")]
  data <- merge(
    all_endpoints,
    data,
    by.x = "endpoint",
    by.y = "endpoint_group",
    all.x = TRUE
  )
  # data$res_time[is.na(data$res_time)] <- 0
  data$mean_time <- round(ave(data$res_time, as.factor(data$endpoint), FUN = mean))
  p <- ggplot(data, aes(x = endpoint, y = res_time, fill = mean_time)) +
    geom_boxplot(show.legend = FALSE, outlier.size = 0.5, ) +
    labs(
      x = "Endpoint",
      y = "Response Time (MS)",
      fill = "Type",
      title = "Average Response Time Per Endpoint"
    ) +
    theme(axis.text.x = element_text(
      angle = 45,
      vjust = 1,
      hjust = 1
    )) +
    scale_fill_distiller(palette = "Spectral")
  return(p)
}

plotEndpointUsage <- function(apiCalls, selector) {
  counts <- as.data.frame(table(apiCalls$endpoint_group))
  colnames(counts) <- c("endpoint_group", "count")
  all_endpoints <- data.frame(endpoint = unique(endpoints)) %>% filter(endpoint %in% selector)
  counts <- merge(
    all_endpoints,
    counts,
    by.x = "endpoint",
    by.y = "endpoint_group",
    all.x = TRUE
  )
  counts$count[is.na(counts$count)] <- 0
  
  p <- ggplot(counts, aes(x = endpoint, y = count)) +
    geom_bar(stat = "identity", position = "dodge") +
    labs(x = "Endpoint", y = "Usage", title = "Usage By Endpoint") +
    theme(axis.text.x = element_text(
      angle = 45,
      vjust = 1,
      hjust = 1
    ))
  
  return(p)
}

getOrderedForPopularity <- function(apiCalls, type) {
  ids <- switch(
    type,
    "Family" = {
      apiCalls[, c("fam_id")]
    },
    "Assembly" = {
      apiCalls[, c("assem_id")]
    },
    "Taxon" = {
      apiCalls[, c("tax_id")]
    },
    "client_ip" = {
      apiCalls[, c("client_ip")]
    },
    {
      stop("Invalid ID Type specified. Use 'Family', 'Assembly', 'Taxon', or 'client_ip'.")
    }
  )
  counts <- as.data.frame(table(ids, dnn = "subj_ids"))
  ordered <- counts[order(counts$Freq, decreasing = FALSE), ]
  return(ordered)
}

plotIDPopularity <- function(selected, type) {
  title <- switch(
    type,
    "Family" = {
      "Family IDs"
    },
    "Assembly" = {
      "Assembly IDs"
    },
    "Taxon" = {
      "Taxon IDs"
    },
    "client_ip" = {
      "Client IP Addresses"
    },
    {
      stop("Invalid ID Type specified. Use 'Family', 'Assembly', 'Taxon',or 'client_ip'.")
    }
  )
  p <- ggplot(selected, aes(x = factor(subj_ids, subj_ids), y = Freq)) +
    geom_bar(stat = "identity", position = "dodge") +
    labs(x = "IDs",
         y = "Count",
         title = paste("Popularity Of ", title)) +
    theme(axis.text.x = element_text(
      angle = 45,
      vjust = 1,
      hjust = 1
    ))
  
  return(p)
}

# Shiny App ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
res_choices <- c("Second", 'Minute', "Hour", "Day")
pop_choices <- c('Family', 'Assembly', 'Taxon')
endpoints <- c(
  "/alignment",
  "/annotations",
  "/assemblies",
  "/blogposts",
  "/classes",
  "/families",
  "/families/{id}",
  "/families/{id}/annotation_stats",
  "/families/{id}/assemblies",
  "/families/{id}/assemblies/{assem_id}/annotations",
  "/families/{id}/assemblies/{assem_id}/annotation_stats",
  "/families/{id}/assemblies/{assem_id}/karyotype",
  "/families/{id}/assemblies/{assem_id}/model_conservation",
  "/families/{id}/assemblies/{assem_id}/model_coverage",
  "/families/{id}/hmm",
  "/families/{id}/relationships",
  "/families/{id}/seed",
  "/families/{id}/sequence",
  "/searches",
  "/searches/{id}",
  "/searches/{id}/alignment",
  "/taxa",
  "/taxa/coverage",
  "/taxa/{id}",
  "/version"
)
spinner_color <- "#739024"
ui <- fluidPage(
  headerPanel("API Stuff"),
  tabsetPanel(
    tabPanel(
      'Summary',
      br(),
      tableOutput("meta") %>% withSpinner(color = spinner_color),
      tableOutput("typesTable"),
      tableOutput("codesTable"),
    ),
    tabPanel(
      'Usage Over Time',
      br(),
      sidebarLayout(
        sidebarPanel(
          selectInput(
            "res",
            label = "Time Resolution",
            choices = res_choices,
            selected = res_choices[3]
          ),
          uiOutput("date_slider")
        ),
        mainPanel(
          plotOutput("UsageTimePlot") %>% withSpinner(color = spinner_color)
        )
      )
    ),
    tabPanel('Popularity', br(), sidebarLayout(
      sidebarPanel(
        selectInput(
          "pop_type",
          label = "Type",
          choices = pop_choices,
          selected = pop_choices[1]
        ),
        uiOutput("pop_slider")
      ),
      mainPanel(
        plotOutput("popularityPlot") %>% withSpinner(color = spinner_color)
      )
    )),
    tabPanel(
      'Endpoint Usage',
      br(),
      sidebarLayout(
        sidebarPanel(
          checkboxGroupInput(
            "usage_endpoint_slector",
            "Endpoints",
            choices = endpoints,
            selected = endpoints
          )
        ),
        mainPanel(
          plotOutput("EPUsagePlot") %>% withSpinner(color = spinner_color)
        )
      )
    ),
    tabPanel(
      'Endpoint Response Time',
      br(),
      sidebarLayout(
        sidebarPanel(
          checkboxGroupInput(
            "re_time_endpoint_slector",
            "Endpoints",
            choices = endpoints,
            selected = endpoints
          )
        ),
        mainPanel(
          plotOutput("AvgResponsePlot") %>% withSpinner(color = spinner_color)
        )
      )
    )
  )
)

server <- function(input, output) {
  # log_csv <- "http://www.repeatmasker.org/~agray/2024-06-24-Export.csv"
  log_csv <- "http://www.repeatmasker.org/~agray/2024-07-10-Export.csv"
  
  df <- getLogData(log_csv)
  apiCalls <- getAPICalls(df)
  
  # Summary Panel ------------------------------------------------
  output$meta <- renderTable({
    from_time <- min(df$datetime)
    to_time <- max(df$datetime)
    n_logs <- nrow(df)
    n_users <- length(unique(df$client_ip))
    meta_labels <- c("Source File",
                     "Time Frame",
                     "Log Line Count",
                     "Unique User IPs")
    meta_data <- c(log_csv, paste(from_time, "to", to_time), n_logs, n_users)
    df <- data.frame(label = meta_labels, data = meta_data)
    df
  }, rownames = FALSE, colnames = FALSE, caption = "Meta Data", caption.placement = getOption("xtable.caption.placement", "top"))
  
  output$typesTable <- renderTable({
    types_tab <- as.data.frame(table(df$type), stringsAsFactors = FALSE)
    conditions <- c("error", "info", "verbose")
    replacement_values <- c("Errors", "Info", "API Calls")
    types_tab$Var1 <- replace(types_tab$Var1,
                              types_tab$Var1 %in% conditions,
                              replacement_values)
    colnames(types_tab) = c("Type", "Count")
    types_tab
  }, caption = "Log Types", caption.placement = getOption("xtable.caption.placement", "top"))
  
  output$codesTable <- renderTable({
    codes <- as.data.frame(table(df$code))
    colnames(codes) = c("Code", "Count")
    codes
  }, caption = "Code Counts", caption.placement = getOption("xtable.caption.placement", "top"))
  
  # Summary End -----------------------------------------------------
  
  # Popularity Panel ------------------------------------------------
  ordered_data <- reactive({
    req(input$pop_type)
    ordered <- getOrderedForPopularity(apiCalls, input$pop_type)
    return(ordered)
  })
  
  output$pop_slider <- renderUI({
    req(input$pop_type)
    ordered <- ordered_data()
    min_val <- min(ordered$Freq, na.rm = TRUE)
    max_val <- max(ordered$Freq, na.rm = TRUE)
    sliderInput(
      "pop_slider",
      label = paste("Frequency Range"),
      min = min_val,
      max = max_val,
      value = c(min_val, max_val),
      round = TRUE
    )
  })
  
  output$popularityPlot <- renderPlot({
    req(input$pop_type, input$pop_slider)
    ordered <- ordered_data()
    selected <- ordered[ordered$Freq >= input$pop_slider[1] &
                          ordered$Freq <= input$pop_slider[2], ]
    plotIDPopularity(selected, input$pop_type)
  })
  # Popularity End ------------------------------------------------
  
  # Usage Panel ---------------------------------------------------
  counts_data <- reactive({
    req(input$res)
    counts <- getCountsByType(df, input$res)
    return(counts)
  })
  output$date_slider <- renderUI({
    req(input$res)
    counts <- counts_data()
    min_val <- min(counts$datetime, na.rm = TRUE)
    max_val <- max(counts$datetime, na.rm = TRUE)
    sliderInput(
      "date_slider",
      label = paste("Date Range"),
      min = min_val,
      max = max_val,
      value = c(min_val, max_val),
    )
  })
  
  output$UsageTimePlot <- renderPlot({
    req(input$date_slider)
    plotUsageOverTime(counts_data(), input$date_slider[1], input$date_slider[2])
  })
  # Popularity End ------------------------------------------------
  
  output$EPUsagePlot <- renderPlot({
    plotEndpointUsage(apiCalls, input$usage_endpoint_slector)
  }, height = 750)
  
  output$AvgResponsePlot <- renderPlot({
    plotAvgResponseTime(apiCalls, input$re_time_endpoint_slector)
  }, height = 750)
  
}

app <- shinyApp(ui, server)
runApp(app, host="10.2.9.26", port=10011, launch.browser=FALSE)
# log_csv <- "http://www.repeatmasker.org/~agray/2024-07-10-Export.csv"
# # log_csv <- "http://www.repeatmasker.org/~agray/2024-06-24-Export.csv"
# df <- getLogData(log_csv)
