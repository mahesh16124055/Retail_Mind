"""
Recommendations API Router - Requirement 3: Simple Recommendations

Provides endpoints for recommendation management:
- Generate recommendations based on risks
- Retrieve recommendations for SKUs/stores
- Accept/reject recommendations with feedback
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
import structlog

from app.core.database import get_db
from app.models.domain_models import Recommendation, RecommendationType
from app.services.recommendation_engine import RecommendationEngine

logger = structlog.get_logger()
router = APIRouter()


class RecommendationFeedback(BaseModel):
    """Model for recommendation feedback"""
    recommendation_id: str
    accepted: bool
    feedback: Optional[str] = None


@router.post("/generate/{store_id}", response_model=List[Recommendation])
async def generate_recommendations(
    store_id: str,
    recommendation_types: Optional[List[RecommendationType]] = Query(
        None, description="Types of recommendations to generate"
    ),
    db: Session = Depends(get_db)
):
    """
    Generate recommendations for a store based on detected risks.
    
    Implements Requirement 3: Simple Recommendations
    - Generate reorder, pricing, and promotional recommendations
    - Rank by priority and expected impact
    """
    logger.info("Generating recommendations", store_id=store_id, types=recommendation_types)
    
    try:
        recommendation_engine = RecommendationEngine()
        all_recommendations = []
        
        # Generate different types of recommendations
        if not recommendation_types or RecommendationType.REORDER in recommendation_types:
            reorder_recs = await recommendation_engine.generate_reorder_recommendations(store_id)
            all_recommendations.extend(reorder_recs)
        
        if not recommendation_types or RecommendationType.DISCOUNT in recommendation_types:
            pricing_recs = await recommendation_engine.generate_pricing_recommendations(store_id)
            all_recommendations.extend(pricing_recs)
        
        if not recommendation_types or RecommendationType.PROMOTE in recommendation_types:
            promo_recs = await recommendation_engine.generate_redistribution_recommendations(store_id)
            all_recommendations.extend(promo_recs)
        
        # Rank recommendations by priority
        ranked_recommendations = await recommendation_engine.rank_recommendations(all_recommendations)
        
        logger.info("Recommendations generated and ranked", 
                   store_id=store_id, count=len(ranked_recommendations))
        
        return ranked_recommendations
        
    except Exception as e:
        logger.error("Failed to generate recommendations", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


@router.get("/store/{store_id}", response_model=List[Recommendation])
async def get_store_recommendations(
    store_id: str,
    recommendation_type: Optional[RecommendationType] = Query(
        None, description="Filter by recommendation type"
    ),
    limit: int = Query(50, description="Maximum number of recommendations to return"),
    db: Session = Depends(get_db)
):
    """
    Get all active recommendations for a store.
    """
    logger.info("Getting store recommendations", store_id=store_id, type=recommendation_type)
    
    try:
        from app.models.database_models import RecommendationDB
        
        query = db.query(RecommendationDB).filter(
            RecommendationDB.store_id == store_id,
            RecommendationDB.accepted_at.is_(None),
            RecommendationDB.rejected_at.is_(None)
        )
        
        if recommendation_type:
            query = query.filter(RecommendationDB.recommendation_type == recommendation_type.value)
        
        recommendations_db = query.order_by(
            RecommendationDB.created_at.desc()
        ).limit(limit).all()
        
        recommendations = []
        for rec_db in recommendations_db:
            rec = Recommendation(
                recommendation_id=rec_db.recommendation_id,
                recommendation_type=RecommendationType(rec_db.recommendation_type),
                sku_id=rec_db.sku_id,
                store_id=rec_db.store_id,
                action=rec_db.action,
                parameters=rec_db.parameters or {},
                expected_outcome=rec_db.expected_outcome or "",
                confidence_level=rec_db.confidence_level,
                estimated_roi=rec_db.estimated_roi,
                explanation=rec_db.explanation or "",
                created_at=rec_db.created_at
            )
            recommendations.append(rec)
        
        logger.info("Store recommendations retrieved", 
                   store_id=store_id, count=len(recommendations))
        
        return recommendations
        
    except Exception as e:
        logger.error("Failed to get store recommendations", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.get("/sku/{store_id}/{sku_id}", response_model=List[Recommendation])
async def get_sku_recommendations(
    store_id: str,
    sku_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all active recommendations for a specific SKU.
    
    Implements Requirement 3.3: Show recommendations when viewing product details
    """
    logger.info("Getting SKU recommendations", store_id=store_id, sku_id=sku_id)
    
    try:
        recommendation_engine = RecommendationEngine()
        recommendations = await recommendation_engine.get_recommendations_for_sku(sku_id, store_id)
        
        logger.info("SKU recommendations retrieved", 
                   sku_id=sku_id, count=len(recommendations))
        
        return recommendations
        
    except Exception as e:
        logger.error("Failed to get SKU recommendations", 
                    store_id=store_id, sku_id=sku_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get SKU recommendations: {str(e)}")


@router.post("/feedback")
async def submit_recommendation_feedback(
    feedback: RecommendationFeedback,
    db: Session = Depends(get_db)
):
    """
    Submit feedback on a recommendation (accept/reject).
    
    Implements Requirement 9: Feedback and Learning
    - Record user feedback on recommendations
    - Enable system learning from user decisions
    """
    logger.info("Submitting recommendation feedback", 
               recommendation_id=feedback.recommendation_id, 
               accepted=feedback.accepted)
    
    try:
        from app.models.database_models import RecommendationDB
        from datetime import datetime
        
        # Find the recommendation
        recommendation = db.query(RecommendationDB).filter(
            RecommendationDB.recommendation_id == feedback.recommendation_id
        ).first()
        
        if not recommendation:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        
        # Update recommendation with feedback
        if feedback.accepted:
            recommendation.accepted_at = datetime.utcnow()
        else:
            recommendation.rejected_at = datetime.utcnow()
        
        recommendation.feedback = feedback.feedback
        
        db.commit()
        
        logger.info("Recommendation feedback recorded", 
                   recommendation_id=feedback.recommendation_id,
                   accepted=feedback.accepted)
        
        return {
            "message": "Feedback recorded successfully",
            "recommendation_id": feedback.recommendation_id,
            "status": "accepted" if feedback.accepted else "rejected"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to submit recommendation feedback", 
                    recommendation_id=feedback.recommendation_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to record feedback: {str(e)}")


@router.get("/feedback-stats/{store_id}")
async def get_feedback_statistics(
    store_id: str,
    days_back: int = Query(30, description="Days of history to analyze"),
    db: Session = Depends(get_db)
):
    """
    Get recommendation feedback statistics for a store.
    
    Analyzes acceptance rates and user feedback patterns.
    """
    logger.info("Getting feedback statistics", store_id=store_id, days_back=days_back)
    
    try:
        from app.models.database_models import RecommendationDB
        from datetime import datetime, timedelta
        from sqlalchemy import func, case
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get recommendation statistics
        stats_query = db.query(
            RecommendationDB.recommendation_type,
            func.count(RecommendationDB.recommendation_id).label('total'),
            func.sum(
                case(
                    (RecommendationDB.accepted_at.isnot(None), 1),
                    else_=0
                )
            ).label('accepted'),
            func.sum(
                case(
                    (RecommendationDB.rejected_at.isnot(None), 1),
                    else_=0
                )
            ).label('rejected'),
            func.sum(
                case(
                    (
                        (RecommendationDB.accepted_at.is_(None)) &
                        (RecommendationDB.rejected_at.is_(None)), 1
                    ),
                    else_=0
                )
            ).label('pending')
        ).filter(
            RecommendationDB.store_id == store_id,
            RecommendationDB.created_at >= cutoff_date
        ).group_by(RecommendationDB.recommendation_type).all()
        
        statistics = {
            "store_id": store_id,
            "analysis_period_days": days_back,
            "by_type": {},
            "overall": {
                "total": 0,
                "accepted": 0,
                "rejected": 0,
                "pending": 0,
                "acceptance_rate": 0.0
            }
        }
        
        total_overall = 0
        accepted_overall = 0
        rejected_overall = 0
        pending_overall = 0
        
        for stat in stats_query:
            rec_type = stat.recommendation_type
            total = stat.total or 0
            accepted = stat.accepted or 0
            rejected = stat.rejected or 0
            pending = stat.pending or 0
            
            acceptance_rate = (accepted / total) if total > 0 else 0.0
            
            statistics["by_type"][rec_type] = {
                "total": total,
                "accepted": accepted,
                "rejected": rejected,
                "pending": pending,
                "acceptance_rate": round(acceptance_rate, 3)
            }
            
            total_overall += total
            accepted_overall += accepted
            rejected_overall += rejected
            pending_overall += pending
        
        # Calculate overall statistics
        overall_acceptance_rate = (accepted_overall / total_overall) if total_overall > 0 else 0.0
        
        statistics["overall"] = {
            "total": total_overall,
            "accepted": accepted_overall,
            "rejected": rejected_overall,
            "pending": pending_overall,
            "acceptance_rate": round(overall_acceptance_rate, 3)
        }
        
        logger.info("Feedback statistics calculated", 
                   store_id=store_id, 
                   total_recommendations=total_overall,
                   acceptance_rate=overall_acceptance_rate)
        
        return statistics
        
    except Exception as e:
        logger.error("Failed to get feedback statistics", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get feedback statistics: {str(e)}")


@router.delete("/clear-old/{store_id}")
async def clear_old_recommendations(
    store_id: str,
    days_old: int = Query(30, description="Clear recommendations older than this many days"),
    db: Session = Depends(get_db)
):
    """
    Clear old recommendations to keep the system clean.
    
    Removes recommendations that are older than the specified number of days
    and have been either accepted or rejected.
    """
    logger.info("Clearing old recommendations", store_id=store_id, days_old=days_old)
    
    try:
        from app.models.database_models import RecommendationDB
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Delete old recommendations that have been processed
        deleted_count = db.query(RecommendationDB).filter(
            RecommendationDB.store_id == store_id,
            RecommendationDB.created_at < cutoff_date,
            (
                (RecommendationDB.accepted_at.isnot(None)) |
                (RecommendationDB.rejected_at.isnot(None))
            )
        ).delete()
        
        db.commit()
        
        logger.info("Old recommendations cleared", 
                   store_id=store_id, deleted_count=deleted_count)
        
        return {
            "message": f"Cleared {deleted_count} old recommendations",
            "store_id": store_id,
            "cutoff_date": cutoff_date.isoformat(),
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        logger.error("Failed to clear old recommendations", 
                    store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to clear recommendations: {str(e)}")