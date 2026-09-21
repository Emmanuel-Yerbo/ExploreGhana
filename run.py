"""
Quick launcher for ExploreGhana Geoportal.
Run with: python run.py
"""
import uvicorn

if __name__ == "__main__":
    print("==========================================================")
    print("  🇬🇭 STARTING EXPLOREGHANA TOURISM GEOPORTAL (V0)")
    print("==========================================================")
    print("  Interactive Map UI:  http://localhost:8000")
    print("  Spatial API Docs:    http://localhost:8000/docs")
    print("  Health Telemetry:    http://localhost:8000/api/health")
    print("==========================================================")
    print("  Press CTRL+C to stop the server.")
    print("==========================================================")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
