from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "operador"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    active: bool

    model_config = ConfigDict(from_attributes=True)
    