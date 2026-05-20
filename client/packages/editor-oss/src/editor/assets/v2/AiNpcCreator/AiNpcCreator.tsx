import React, {useState, useRef, useEffect} from "react";

import * as S from "./AiNpcCreator.styles";
import {addNPC, Career, NPCBackendData, NPCCreateData, updateNPC} from "@stem/network/api/npc";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {NumericInput} from "../common/NumericInput";
import {StyledButton} from "../common/StyledButton";
import {StyledTextarea} from "../common/StyledTextarea";
import {UploadField} from "../common/UploadField/UploadField";
interface AiNpcCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    editNpc?: NPCBackendData | null;
}

export const AiNpcCreator: React.FC<AiNpcCreatorProps> = ({isOpen, onClose, editNpc}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<NPCCreateData>({
        Name: "",
        ProfileImage: "",
        Bio: "",
        Personality: "",
        ResponseStyle: "",
        Wallet: 0,
        Inventory: [],
        Careers: [],
    });

    const [newCareer, setNewCareer] = useState({
        Name: "",
        Rating: 0,
    });

    const [isLoading, setIsLoading] = useState(false);

    // Load edit data when editNpc changes
    useEffect(() => {
        if (editNpc) {
            setFormData({
                Name: editNpc.Name,
                ProfileImage: editNpc.ProfileImage ?? "",
                Bio: editNpc.Bio ?? "",
                Personality: editNpc.Personality ?? "",
                ResponseStyle: editNpc.ResponseStyle ?? "",
                Wallet: editNpc.Wallet,
                Inventory: editNpc.Inventory ?? [],
                Careers: editNpc.Careers ?? [],
            });
        }
    }, [editNpc]);

    const handleInputChange = (field: keyof NPCCreateData, value: string | number | string[] | Career[]) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAddCareer = () => {
        if (newCareer.Name.trim() && newCareer.Rating > 0) {
            setFormData(prev => ({
                ...prev,
                Careers: [...prev.Careers ?? [], {...newCareer}],
            }));
            setNewCareer({Name: "", Rating: 0});
        }
    };

    const handleRemoveCareer = (index: number) => {
        setFormData(prev => ({
            ...prev,
            Careers: prev.Careers?.filter((_, i) => i !== index) ?? [],
        }));
    };

    const handleImportJson = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            try {
                const json = JSON.parse(e.target?.result as string) as NPCCreateData;
                setFormData({
                    Name: json.Name ?? "",
                    ProfileImage: json.ProfileImage ?? "",
                    Bio: json.Bio ?? "",
                    Personality: json.Personality ?? "",
                    ResponseStyle: json.ResponseStyle ?? "",
                    Wallet: json.Wallet ?? 0,
                    Inventory: json.Inventory ?? [],
                    Careers: json.Careers ?? [],
                });
                showToast({type: "success", body: "NPC data imported successfully"});
            } catch {
                showToast({type: "error", body: "Invalid JSON file"});
            }
        };
        reader.readAsText(file);
    };

    const handleExport = () => {
        const dataToExport = {
            Name: formData.Name,
            ProfileImage: formData.ProfileImage,
            Bio: formData.Bio,
            Personality: formData.Personality,
            ResponseStyle: formData.ResponseStyle,
            Wallet: formData.Wallet,
            Inventory: formData.Inventory,
            Careers: formData.Careers,
        };

        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${formData.Name || "npc"}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast({type: "success", body: "NPC data exported successfully"});
    };

    const handleSave = async () => {
        if (!formData.Name.trim()) {
            showToast({type: "error", body: "Name is required"});
            return;
        }

        setIsLoading(true);
        try {
            if (editNpc) {
                await updateNPC({
                    ID: editNpc.ID,
                    ...formData,
                });
                showToast({type: "success", body: "AI NPC updated successfully"});
            } else {
                await addNPC(formData);
                showToast({type: "success", body: "AI NPC created successfully"});
            }
            handleClose();
        } catch (error) {
            const action = editNpc ? "update" : "create";
            showToast({type: "error", body: `Failed to ${action} NPC: ${String(error)}`});
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            Name: "",
            ProfileImage: "",
            Bio: "",
            Personality: "",
            ResponseStyle: "",
            Wallet: 0,
            Inventory: [],
            Careers: [],
        });
        setNewCareer({Name: "", Rating: 0});
        onClose();
        global.app?.call("refreshAiNpcsList");
    };

    if (!isOpen) return null;

    return (
        <S.ModalOverlay>
            <S.ModalContent>
                <S.ModalHeader>
                    <div className="heading">{editNpc ? "Edit AI NPC" : "Create AI NPC"}</div>
                    <S.HeaderButtons>
                        {editNpc && 
                            <StyledButton isGrey
                                onClick={handleExport}
                                style={{width: "auto", marginRight: "8px"}}
                            >
                                Export JSON
                            </StyledButton>
                        }
                        <StyledButton onClick={handleClose}
                            style={{width: "80px"}}
                            isGreySecondary
                        >
                            Close
                        </StyledButton>
                    </S.HeaderButtons>
                </S.ModalHeader>
                <S.ScrollableBody>
                    <S.Container>
                        {/* Import Section */}
                        <S.ImportSection>
                            <S.ImportText>Import NPC data from JSON file</S.ImportText>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                style={{display: "none"}}
                                onChange={handleFileChange}
                            />
                            <StyledButton isGrey
                                onClick={handleImportJson}
                            >
                                Import from JSON
                            </StyledButton>
                        </S.ImportSection>

                        {/* Basic Information */}
                        <S.Section>
                            <S.SectionTitle>Basic Information</S.SectionTitle>

                            <S.Row>
                                <S.Label>Name *</S.Label>
                                <S.Input
                                    type="text"
                                    placeholder="Enter NPC name"
                                    value={formData.Name}
                                    onChange={e => handleInputChange("Name", e.target.value)}
                                />
                            </S.Row>

                            <S.Row>
                                <S.Label>Profile Image</S.Label>
                                <UploadField
                                    width="100%"
                                    height="112px"
                                    style={{backgroundColor: "var(--theme-grey-bg)", width: "100%"}}
                                    withButton
                                    uploadedFile={formData.ProfileImage ?? null}
                                    setUploadedFile={imageUrl => handleInputChange("ProfileImage", typeof imageUrl === "string" ? imageUrl : "")}
                                />
                            </S.Row>

                            <S.Row>
                                <S.Label>Wallet</S.Label>
                                <NumericInput
                                    width="auto"
                                    value={formData.Wallet || 0}
                                    enableDragging={false}
                                    setValue={val => handleInputChange("Wallet", val)}
                                />
                            </S.Row>
                        </S.Section>

                        {/* Character Details */}
                        <S.Section>
                            <S.SectionTitle>Character Details</S.SectionTitle>

                            <S.Row>
                                <S.Label>Bio</S.Label>
                                <StyledTextarea
                                    placeholder="Enter NPC biography"
                                    value={formData.Bio || ""}
                                    setValue={val => handleInputChange("Bio", val)}
                                />
                            </S.Row>

                            <S.Row>
                                <S.Label>Personality</S.Label>
                                <StyledTextarea
                                    placeholder="Describe NPC personality traits"
                                    value={formData.Personality || ""}
                                    setValue={val => handleInputChange("Personality", val)}
                                />
                            </S.Row>

                            <S.Row>
                                <S.Label>Response Style</S.Label>
                                <StyledTextarea
                                    placeholder="Define how the NPC responds to conversations"
                                    value={formData.ResponseStyle || ""}
                                    setValue={val => handleInputChange("ResponseStyle", val)}
                                />
                            </S.Row>
                        </S.Section>

                        {/* Careers */}
                        <S.Section>
                            <S.SectionTitle>Careers</S.SectionTitle>

                            <S.CareerInputRow>
                                <S.CareerInputWrapper>
                                    <S.Label>Career Name</S.Label>
                                    <S.Input
                                        type="text"
                                        placeholder="e.g., Blacksmith"
                                        value={newCareer.Name}
                                        onChange={e => setNewCareer(prev => ({...prev, Name: e.target.value}))}
                                    />
                                </S.CareerInputWrapper>

                                <S.CareerInputWrapper>
                                    <S.Label>Rating (1-100)</S.Label>
                                    <NumericInput
                                        width="100%"
                                        min={1}
                                        max={100}
                                        value={newCareer.Rating || 0}
                                        setValue={val => setNewCareer(prev => ({...prev, Rating: val}))}
                                    />
                                </S.CareerInputWrapper>

                                <StyledButton
                                    width="64px"
                                    height="24px"
                                    isGrey
                                    onClick={handleAddCareer}
                                    style={{marginTop: "20px"}}
                                >
                                    Add
                                </StyledButton>
                            </S.CareerInputRow>

                            {formData.Careers && formData.Careers.length > 0 ? 
                                <S.CareersList>
                                    {formData.Careers.map((career: Career, index: number) => {
                                        return (
                                            <S.CareerItem key={index}>
                                                <S.CareerInfo>
                                                    <S.CareerName>{career.Name}</S.CareerName>
                                                    <S.CareerRating>Rating: {career.Rating}</S.CareerRating>
                                                </S.CareerInfo>
                                                <S.DeleteButton onClick={() => handleRemoveCareer(index)}>
                                                    Remove
                                                </S.DeleteButton>
                                            </S.CareerItem>
                                        );
                                    })}
                                </S.CareersList>
                             : null}
                        </S.Section>

                        {/* Action Buttons */}
                        <S.ButtonsRow>
                            <StyledButton isGrey
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </StyledButton>
                            <StyledButton onClick={handleSave}
                                disabled={isLoading}
                                isBlue
                            >
                                {isLoading ? "Creating..." : "Create NPC"}
                            </StyledButton>
                        </S.ButtonsRow>
                    </S.Container>
                </S.ScrollableBody>
            </S.ModalContent>
        </S.ModalOverlay>
    );
};
