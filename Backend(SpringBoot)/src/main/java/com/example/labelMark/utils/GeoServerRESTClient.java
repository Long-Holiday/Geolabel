package com.example.labelMark.utils;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Base64;

@Service
public class GeoServerRESTClient {

    private static final String GEOSERVER_REST_URL = "http://localhost:8081/geoserver/rest";
    private static final String WORKSPACE = "LUU";
    private static final String DATASTORE = "test";
    private static final String LAYER = "airport";
    private static final String USERNAME = "admin";
    private static final String PASSWORD = "geoserver";
    private static final String LAYERNAME = "airport";
    public String getLayerInfo (String filename) {
        try {
            String layersEndpoint = GEOSERVER_REST_URL + "/layers/" + WORKSPACE + ":" + filename + ".json";
            String auth = USERNAME + ":" + PASSWORD;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

            URL url = new URL(layersEndpoint);
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("GET");
            con.setRequestProperty("Authorization", "Basic " + encodedAuth);

            int responseCode = con.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
                String inputLine;
                StringBuilder response = new StringBuilder();
                while ((inputLine = in.readLine()) != null) {
                    response.append(inputLine);
                }
                in.close();

                // 处理获取到的图层信息
                return response.toString();
            } else {
                return "GET request not worked. Response code: " + responseCode;

            }
        } catch (Exception e) {
            e.printStackTrace();
            return "ERROR";
        }

    }

    public String getCoverageInfo(String filename) {
        try {
            String auth = USERNAME + ":" + PASSWORD;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

            URL coverageUrl = new URL(filename);
            HttpURLConnection coverageCon = (HttpURLConnection) coverageUrl.openConnection();
            coverageCon.setRequestMethod("GET");
            coverageCon.setRequestProperty("Authorization", "Basic " + encodedAuth);

            int coverageResponseCode = coverageCon.getResponseCode();
            if (coverageResponseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader coverageIn = new BufferedReader(new InputStreamReader(coverageCon.getInputStream()));
                String inputLine;
                StringBuilder coverageResponse = new StringBuilder();
                while ((inputLine = coverageIn.readLine()) != null) {
                    coverageResponse.append(inputLine);
                }
                coverageIn.close();

                return coverageResponse.toString();
            } else {
                return "GET request for coverage not worked. Response code: " + coverageResponseCode;
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "ERROR: " + e.getMessage();
        }
    }
}
