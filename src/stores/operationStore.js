import { defineStore } from "pinia";
import { b64DecodeUnicode } from "../utils/utils";

export const useOperationStore = defineStore("operationStore", {
    state: () => {
        return {
            operations: [],
            selectedOperation: {},
            selectedLink: {},
            facts: {}
        };
    },

    actions: {
        async getOperations($api) {
            try {
                const response = await $api.get("/api/v2/operations");
                // TODO: Sort operations
                this.operations = response.data;
            } catch(error) {
                console.error("Error fetching operations", error);
            }
        },
        async createOperation($api, operation) {
            try{
                const response = await $api.post("/api/v2/operations", operation);
                this.operations.push(response.data);
                this.selectedOperation = response.data;
            } catch(error) {
                console.error("Error creating operation", error);
            }
        },
        async deleteOperation($api, operationID) {
            try{
                await $api.delete(`/api/v2/operations/${operationID}`);
                this.selectedOperation = "";
                this.operations = this.operations.filter(el => el.id !== operationID);
            } catch(error){
                console.error("Error deleting operation", error);
            }
        },
        async updateOperationChain($api) {
            try {
                const response = await $api.get(`/api/v2/operations/${this.selectedOperation.id}`);
                // Make sure we are updating the correct operation just in case
                if(this.selectedOperation.id != response.data.id){
                    return;
                }
                Object.assign(this.selectedOperation, response.data);
            } catch(error) {
                console.error("Error updating operation chain", error);
            }

        },
        async updateOperation($api, field, updateValue) {
            this.selectedOperation[field] = updateValue;
            try {
                const response = await $api.patch(`/api/v2/operations/${this.selectedOperation.id}`, this.selectedOperation);
                return response.data;
            } catch(error) {
                console.error("Error updating operation", error);
            }
        },
        async rerunOperation($api){
            let { id, start, state, chain, host_group, ...newOp } = this.selectedOperation;
            let dateMatches = newOp.name.match(/[(]\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}:\d{2} [A|P]M[)]$/g);
            let stringToReplace = (dateMatches && dateMatches.length) ? dateMatches[dateMatches.length - 1] : '';
            let date = `(${new Date().toLocaleString()})`;
            newOp.name = stringToReplace ? (newOp.name.replace(stringToReplace, date)) : (`${newOp.name} ${date}`);
            try {
                const response = await $api.post('/api/v2/operations', newOp);
                this.operations.push(response.data);
                this.selectedOperation = response.data;
            } catch (error) {
                console.error("Error rerunning operation", error);
            }
        },
        isOperationRunning() {
            if (!this.selectedOperation) return false;
            return !(this.selectedOperation.state === 'finished' || this.selectedOperation.state === 'cleanup' || this.selectedOperation.state === 'out_of_time');
        },
        async updateLink($api, status, command = null) {
            const updatedLink = {
                ...this.selectedLink,
                command: b64DecodeUnicode(this.selectedLink.command)
            };
            if (command) updatedLink.command = command;
            updatedLink.status = status;
            try {
                const response = await $api.patch(`/api/v2/operations/${this.selectedOperation.id}/links/${this.selectedLink.id}`, updatedLink);
                await this.updateOperationChain($api);
                return response.data;
            } catch (error) {
                console.error("Error updating link state", error);
            }
        },
        async addManualCommand($api, manualCommand) {
            try {
                const response = await $api.post(`/api/v2/operations/${this.selectedOperation.id}/potential-links`, manualCommand);
                await this.updateOperationChain($api);
                return response.data;
            } catch (error) {
                console.error("Error adding manual command", error);
            }
        },
        async addPotentialLinks($api, potentialLink) {
            try {
                for (let link of potentialLink) {
                    await $api.post(`/api/v2/operations/${this.selectedOperation.id}/potential-links`, link);
                }
                await this.updateOperationChain($api);
            } catch (error) {
                console.error("Error adding potential links", error);
            }
        },
        async getFacts($api) {
            if (!this.selectedOperation) return;
            try {
                const response = await $api.get(`/api/v2/facts/${this.selectedOperation.id}`);
                this.facts = response.data.found;
            } catch (error) {
                console.error("Error getting facts");
            }
        },
        async downloadOperationInfo($api, format, operationID, isAgentOutput) {
            switch (format){
                case 0:
                    format = "report";
                    break;
                case 1:
                    format = "event-logs";
                    break;
                case 2:
                    format = "csv";
                    break;
                default:
                    format = "report";
                    break;
            }
            if(format !== "csv"){            
                try{
                    const response = await $api.post(`/api/v2/operations/${operationID}/${format}`, {enable_agent_output: isAgentOutput});
                    const data = JSON.stringify(response.data);
                    const blob = new Blob([data], {type: 'text/plain'})
                    this.createDownloadReport(blob, 'json', format)
                } catch(error) {
                    console.error("Error downloading operation", error);
                }
            }else{
                let csv = [ 'Time Ran,Ability Name,Agent,Host,pid,Link Command,Link Output' ]
                this.selectedOperation.chain.forEach((link) => {
                    const rowItems = [];
                    rowItems.push(link.decide);
                    rowItems.push(link.ability.name);
                    rowItems.push(link.paw);
                    rowItems.push(link.host);
                    rowItems.push(link.pid);
                    rowItems.push(b64DecodeUnicode(link.command));
                    rowItems.push(b64DecodeUnicode(link.plaintext_command));
                    csv.push(rowItems.join(','));
                });
                const blob = new Blob([csv.join('\n')], {type: 'text/csv'});
                this.createDownloadReport(blob, 'csv', format); 
            }

        },
        createDownloadReport(blob, fileName, format) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${this.selectedOperation.name}_${format}.${fileName}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        }
    },
});
