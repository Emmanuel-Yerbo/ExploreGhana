from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class EntryFee(BaseModel):
    local_adult: float = Field(..., description="Entrance fee for Ghanaian adult citizen in GHS")
    local_student: float = Field(0.0, description="Entrance fee for Ghanaian student in GHS")
    foreigner_adult: float = Field(..., description="Entrance fee for non-resident adult in GHS")
    foreigner_student: float = Field(0.0, description="Entrance fee for non-resident student in GHS")
    fee_verified: bool = Field(False, description="Whether admission fees have been officially re-verified on-site or via direct agency tariff sheet")

class RoadAccess(BaseModel):
    surface: str = Field(..., description="Road surface type, e.g., paved asphalt, laterite track")
    passable_rainy_season: bool = Field(True, description="Whether accessible year-round in heavy rains")
    vehicle_recommended: str = Field(..., description="Recommended vehicle type: Saloon, 4x4, Trotro")

class Attraction(BaseModel):
    id: str
    name: str
    local_name: Optional[str] = None
    category: str
    region: str
    region_id: Optional[str] = None
    district: str
    latitude: float
    longitude: float
    elevation_m: Optional[int] = None
    description: str
    historical_period: Optional[str] = None
    entry_fee_ghs: EntryFee
    opening_hours: str
    contact_phone: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    duration_hours: Optional[float] = None
    guided_tours: bool = True
    wheelchair_accessible: bool = False
    tags: List[str] = []
    image_url: str
    gallery: List[str] = []
    what_to_bring: List[str] = []
    road_access: RoadAccess
    source: Optional[str] = Field("Official Register / Verified Authority", description="Authoritative reference source for entity data")
    verified_date: Optional[str] = Field("2026-09-22", description="Date of last data grounding verification")
    distance_km: Optional[float] = Field(None, description="Calculated distance in km when querying proximity")

class AttractionGeoJSONFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

class AttractionGeoJSONCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[AttractionGeoJSONFeature]

class SystemHealth(BaseModel):
    status: str
    service: str
    version: str
    total_attractions: int
    regions_covered: List[str]
    spatial_engine: str

class MicroSpatialDisputedSource(BaseModel):
    source_name: str
    url: Optional[str] = None
    stated_value: str
    note: Optional[str] = None

class DisputedSpecification(BaseModel):
    parameter: str
    consensus_summary: str
    sources: List[MicroSpatialDisputedSource]

class PreTripChecklistItem(BaseModel):
    id: str
    title: str
    category: str
    icon: str
    mandatory: bool
    rationale: str

class MicroSpatialFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

class MicroSpatialGeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: List[MicroSpatialFeature]

class StoryChapter(BaseModel):
    id: str
    act_number: int
    act_title: str
    era: str
    subtitle: str
    elevation_m: int
    camera: Dict[str, Any]
    highlight_layers: List[str]
    narrative: str
    proverb: str
    ecological_focus: str
    cultural_heritage: str

class VerticalStratum(BaseModel):
    stratum: str
    altitude_label: str
    color: str
    icon: str
    sunlight_pct: int
    humidity_pct: int
    temperature_c: int
    human_experience: str
    key_species: List[str]

class EligibilityCriterion(BaseModel):
    id: str
    label: str
    icon: str
    recommendation: str
    badge_color: str
    guidance: str

class MicroSpatialResponse(BaseModel):
    attraction_id: str
    site_name: str
    region_id: str
    district: str
    center_coordinates: Dict[str, Any]
    geojson: MicroSpatialGeoJSON
    disputed_specifications: List[DisputedSpecification]
    operational_parameters: Dict[str, Any]
    physical_safety_protocols: Dict[str, Any]
    pre_trip_checklist: List[PreTripChecklistItem]
    official_contacts: List[Dict[str, Any]]
    story_chapters: Optional[List[StoryChapter]] = None
    vertical_stratification: Optional[List[VerticalStratum]] = None
    eligibility_criteria: Optional[List[EligibilityCriterion]] = None


