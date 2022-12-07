import React, {useContext, useState} from 'react'
import {Textarea} from '@chakra-ui/react'
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader, ModalCloseButton, ModalBody, VStack, Text, ModalFooter, Button
} from '@chakra-ui/react'

export interface ToolbarProps {
    fileName: string
    content: string
    onEdit: any
    onClose: any
    showModal: boolean
}

export const EditFileModal = (props: ToolbarProps) => {
    const {
        fileName,
        content,
        onEdit,
        onClose,
        showModal,
    } = props;
    const [value, setValue] = useState(content);
    return (
        <Modal
            isCentered
            isOpen={showModal}
            onClose={() => onClose()}
        >
            <ModalOverlay/>
            <ModalContent zIndex="popover">
                <ModalHeader>{fileName}</ModalHeader>
                <ModalCloseButton/>
                <ModalBody>
                    <VStack spacing={4} display="flex" alignItems="flex-start">
                        <Text>Edit file:</Text>
                        <Textarea value={value} onChange={(e) => {
                            setValue(e.target.value);
                        }}/>
                        <Text>Add tags:</Text>
                        <Text>Todo</Text>
                        <Text>Tags:</Text>
                        <Text>Todo</Text>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        mr={3}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="link"
                        colorScheme="red"
                        ml={3}
                        onClick={() => {
                            if (!!onEdit) {
                                onEdit(value);
                            }
                        }}
                    >
                        Ok
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
